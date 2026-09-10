import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * D32 — o teste que define se o produto pode existir.
 *
 * Multi-tenant sem isolamento provado não é multi-tenant, é vazamento com
 * paginação. Nas versões anteriores duas migrations existiram só para consertar
 * RLS; desta vez a RLS é a primeira coisa testada, não a última.
 *
 * Depende do supabase/seed.sql: escola A = KNN Sorocaba (com rede),
 * escola B = Escola Aurora (independente).
 *
 * Roda contra o Supabase de verdade. Sem credenciais, os testes são pulados —
 * assim `npm run verify` continua verde antes de o projeto existir.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const configured = Boolean(SUPABASE_URL && ANON_KEY);

// Um teste de segurança que pula em silêncio é pior que um que falha: ele
// devolve suíte verde sem ter verificado nada. Se estes 14 casos forem pulados,
// isso precisa aparecer no terminal.
if (!configured) {
  console.warn(
    "\n⚠️  RLS · isolamento entre tenants — 14 casos PULADOS.\n" +
      "   Faltam NEXT_PUBLIC_SUPABASE_URL e/ou a chave publicável em .env.local.\n" +
      "   A suíte fica verde sem ter provado isolamento nenhum.\n",
  );
}

const PASSWORD = "unipass-dev-2026";

const SCHOOL_A = "22222222-0000-0000-0000-00000000000a";
const SCHOOL_B = "22222222-0000-0000-0000-00000000000b";

const MEMBER_A = "99999999-0000-0000-0000-0000000000a1"; // Maria, KNN Sorocaba
const MEMBER_B = "99999999-0000-0000-0000-0000000000b1"; // Bruno, Aurora

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signIn(email: string): Promise<SupabaseClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) {
    throw new Error(
      `Falha ao logar como ${email}: ${error.message}. O supabase/seed.sql foi aplicado?`,
    );
  }
  return client;
}

describe.skipIf(!configured)("RLS · isolamento entre tenants", () => {
  let schoolA: SupabaseClient;
  let schoolB: SupabaseClient;
  let studentA: SupabaseClient;
  let partnerOwner: SupabaseClient;

  beforeAll(async () => {
    [schoolA, schoolB, studentA, partnerOwner] = await Promise.all([
      signIn("coord.sorocaba@knn.test"),
      signIn("coord.aurora@aurora.test"),
      signIn("maria.aluna@knn.test"),
      signIn("dono@cantinasabor.test"),
    ]);
  });

  afterAll(async () => {
    await Promise.all(
      [schoolA, schoolB, studentA, partnerOwner]
        .filter(Boolean)
        .map((c) => c.auth.signOut()),
    );
  });

  // ---------------------------------------------------------------------------
  // O teste central
  // ---------------------------------------------------------------------------
  it("escola A não lê NENHUM membro da escola B", async () => {
    const { data, error } = await schoolA.from("members").select("id, school_id");

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.length).toBeGreaterThan(0); // vê os próprios
    expect(data!.every((m) => m.school_id === SCHOOL_A)).toBe(true);
  });

  it("escola B não lê NENHUM membro da escola A", async () => {
    const { data, error } = await schoolB.from("members").select("id, school_id");

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((m) => m.school_id === SCHOOL_B)).toBe(true);
  });

  it("buscar um membro da outra escola pelo id retorna vazio, não erro", async () => {
    // Retornar vazio em vez de 403 é proposital: um 403 confirmaria que o id
    // existe, o que já é informação demais.
    const { data, error } = await schoolA.from("members").select("id").eq("id", MEMBER_B);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("escola A não consegue ESCREVER na escola B", async () => {
    const { error } = await schoolB
      .from("members")
      .update({ full_name: "Invasão" })
      .eq("id", MEMBER_A);

    // A linha simplesmente não é visível para o update, então nada acontece.
    const { data: check } = await schoolA.from("members").select("full_name").eq("id", MEMBER_A);

    expect(check?.[0]?.full_name).not.toBe("Invasão");
    expect(error === null || error.code === "42501").toBe(true);
  });

  it("escola A não consegue INSERIR membro na escola B", async () => {
    const { error } = await schoolA.from("members").insert({
      school_id: SCHOOL_B,
      kind: "student",
      full_name: "Aluno Plantado",
      cpf: "25836914737",
      birth_date: "2000-01-01",
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501"); // insufficient_privilege
  });

  it("escola A não lê validações da escola B", async () => {
    const { data, error } = await schoolA.from("validations").select("id, school_id");

    expect(error).toBeNull();
    expect(data!.every((v) => v.school_id === SCHOOL_A)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Aluno
  // ---------------------------------------------------------------------------
  it("aluno enxerga a si mesmo e aos próprios dependentes, e nada além", async () => {
    const { data, error } = await studentA.from("members").select("id, school_id");

    expect(error).toBeNull();
    expect(data!.some((m) => m.id === MEMBER_A)).toBe(true);
    expect(data!.some((m) => m.id === MEMBER_B)).toBe(false);
    // Maria + o filho dela. Nunca os colegas de turma.
    expect(data!.length).toBeLessThanOrEqual(2);
  });

  it("aluno não lê o cadastro de colegas da própria escola", async () => {
    const { data } = await studentA
      .from("members")
      .select("id")
      .eq("id", "99999999-0000-0000-0000-0000000000a2"); // Pedro, mesma escola

    expect(data).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Parceiro — D33. É a defesa contra varredura da base.
  // ---------------------------------------------------------------------------
  it("parceiro NÃO tem leitura direta de members, nem das escolas que atende", async () => {
    // A Cantina Sabor tem parceria ativa com as DUAS escolas. Mesmo assim, a
    // única porta para os dados do membro é a RPC de validação, que devolve os
    // campos do PRD §9 e registra a tentativa.
    const { data, error } = await partnerOwner.from("members").select("id, full_name, cpf");

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("parceiro só lê as próprias validações", async () => {
    const { data, error } = await partnerOwner.from("validations").select("id, partner_id");

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((v) => v.partner_id === "44444444-0000-0000-0000-000000000001")).toBe(true);
  });

  it("parceiro não lê a equipe de outro parceiro", async () => {
    const { data } = await partnerOwner.from("partner_staff").select("id, partner_id");

    expect(data!.every((s) => s.partner_id === "44444444-0000-0000-0000-000000000001")).toBe(true);
  });

  it("ninguém escreve em validations direto — só a RPC (D31)", async () => {
    const { error } = await partnerOwner.from("validations").insert({
      school_id: SCHOOL_A,
      partner_id: "44444444-0000-0000-0000-000000000001",
      validated_by: "66666666-0000-0000-0000-000000000001",
      method: "cpf",
      result: "approved",
      member_id: MEMBER_A,
      benefit_id: "88888888-0000-0000-0000-000000000001",
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });

  // ---------------------------------------------------------------------------
  // Rede — D02
  // ---------------------------------------------------------------------------
  it("escola independente não aparece para o admin da rede", async () => {
    const networkAdmin = await signIn("rede@knn.test");
    const { data, error } = await networkAdmin.from("schools").select("id");

    expect(error).toBeNull();
    expect(data!.some((s) => s.id === SCHOOL_A)).toBe(true);
    expect(data!.some((s) => s.id === SCHOOL_B)).toBe(false);

    await networkAdmin.auth.signOut();
  });

  // ---------------------------------------------------------------------------
  // Anônimo
  // ---------------------------------------------------------------------------
  it("sem sessão não se lê nada", async () => {
    const anon = anonClient();

    for (const table of ["members", "validations", "profiles", "schools"] as const) {
      const { data } = await anon.from(table).select("id");
      expect(data ?? []).toEqual([]);
    }
  });
});
