import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Fluxos do Dia 3 contra o banco real.
 *
 * Exercita o que as Server Actions fazem — criar escola, convidar coordenador,
 * cadastrar aluno sob RLS — sem passar pelo navegador. Pega o que teste de
 * unidade não pega: coluna faltando, constraint, trigger que não disparou,
 * política de RLS que nega o que deveria permitir.
 *
 * Cria dados de verdade e limpa no final. O prefixo TST- identifica o que é
 * lixo de teste caso alguma limpeza falhe.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

const configured = Boolean(URL && PUBLISHABLE && SECRET);

if (!configured) {
  console.warn(
    "\n⚠️  Onboarding de escola — casos PULADOS. Falta URL, chave publicável ou secret key.\n",
  );
}

const stamp = Date.now().toString(36).toUpperCase().slice(-5);
const SLUG = `tst-escola-${stamp.toLowerCase()}`;
const PREFIX = `TST${stamp.slice(0, 2)}`;
const ADMIN_EMAIL = `tst.coord.${stamp.toLowerCase()}@unipass.test`;
const PASSWORD = "unipass-dev-2026";

// CPFs válidos reservados para este teste.
const CPF_STUDENT = "36925814755";
const CPF_OTHER = "25836914737";

describe.skipIf(!configured)("Onboarding de escola e cadastro de aluno", () => {
  let admin: SupabaseClient;
  let schoolId: string | null = null;
  let adminUserId: string | null = null;
  let memberId: string | null = null;
  let coordClient: SupabaseClient | null = null;

  beforeAll(() => {
    admin = createClient(URL!, SECRET!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  afterAll(async () => {
    // Ordem inversa da criação. members/students caem por cascade da escola.
    if (coordClient) await coordClient.auth.signOut();
    if (schoolId) await admin.from("schools").delete().eq("id", schoolId);
    if (adminUserId) await admin.auth.admin.deleteUser(adminUserId).catch(() => {});
  });

  it("cria escola independente, sem rede (D02)", async () => {
    const { data, error } = await admin
      .from("schools")
      .insert({
        name: `Escola de Teste ${stamp}`,
        slug: SLUG,
        member_code_prefix: PREFIX,
        city: "Sorocaba",
        state: "SP",
        network_id: null,
        plan_id: "essencial",
        student_limit: 200,
        status: "trial",
      })
      .select("id, network_id, free_dependents, paid_slots")
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.network_id).toBeNull();
    // Defaults do D07 vêm do banco, não da aplicação.
    expect(data!.free_dependents).toBe(2);
    expect(data!.paid_slots).toBe(2);

    schoolId = data!.id;
  });

  it("recusa escola com slug duplicado", async () => {
    const { error } = await admin.from("schools").insert({
      name: "Duplicada",
      slug: SLUG,
      member_code_prefix: "DUP",
      plan_id: "essencial",
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("23505");
  });

  it("recusa prefixo fora do formato", async () => {
    const { error } = await admin.from("schools").insert({
      name: "Prefixo ruim",
      slug: `${SLUG}-x`,
      member_code_prefix: "prefixo minusculo",
      plan_id: "essencial",
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("schools_prefix_format");
  });

  it("cria o coordenador e gera o link de convite", async () => {
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "invite",
      email: ADMIN_EMAIL,
      options: { data: { full_name: "Coordenador de Teste" } },
    });

    expect(linkError).toBeNull();
    expect(link.properties?.action_link).toBeTruthy();

    adminUserId = link.user?.id ?? null;
    expect(adminUserId).toBeTruthy();

    const { error: profileError } = await admin.from("profiles").insert({
      id: adminUserId!,
      role: "school_admin",
      school_id: schoolId!,
      full_name: "Coordenador de Teste",
      email: ADMIN_EMAIL,
      status: "invited",
    });

    expect(profileError).toBeNull();
  });

  it("recusa perfil cujo papel não combina com o vínculo", async () => {
    // school_admin sem school_id passaria pela RLS enxergando nada — ou tudo.
    // A constraint profiles_tenant_matches_role existe para isso.
    const { data: link } = await admin.auth.admin.generateLink({
      type: "invite",
      email: `tst.orfao.${stamp.toLowerCase()}@unipass.test`,
    });

    const orphanId = link.user?.id;
    expect(orphanId).toBeTruthy();

    const { error } = await admin.from("profiles").insert({
      id: orphanId!,
      role: "school_admin",
      school_id: null,
      full_name: "Coordenador sem escola",
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("profiles_tenant_matches_role");

    await admin.auth.admin.deleteUser(orphanId!).catch(() => {});
  });

  describe("como coordenador, sob RLS", () => {
    beforeAll(async () => {
      // Convite gera usuário sem senha; definimos uma para poder logar.
      await admin.auth.admin.updateUserById(adminUserId!, {
        password: PASSWORD,
        email_confirm: true,
      });

      coordClient = createClient(URL!, PUBLISHABLE!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { error } = await coordClient.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: PASSWORD,
      });
      expect(error).toBeNull();
    });

    it("cadastra aluno e o banco gera o member_code", async () => {
      const { data, error } = await coordClient!
        .from("members")
        .insert({
          school_id: schoolId!,
          kind: "student",
          full_name: "Aluno de Teste",
          cpf: CPF_STUDENT,
          birth_date: "2005-04-12",
          status: "active",
        })
        .select("id, member_code, photo_status, status")
        .single();

      expect(error).toBeNull();
      expect(data!.member_code).toMatch(new RegExp(`^${PREFIX}-[A-Z0-9]{5}$`));
      // Sem foto aprovada, sem desconto (D08) — o default nasce pendente.
      expect(data!.photo_status).toBe("pending");

      memberId = data!.id;
    });

    it("normaliza o CPF com máscara para 11 dígitos", async () => {
      const { data, error } = await coordClient!
        .from("members")
        .insert({
          school_id: schoolId!,
          kind: "student",
          full_name: "Aluno Com Máscara",
          cpf: "258.369.147-37",
          birth_date: "2004-01-01",
        })
        .select("id, cpf")
        .single();

      expect(error).toBeNull();
      expect(data!.cpf).toBe(CPF_OTHER);

      await coordClient!.from("members").delete().eq("id", data!.id);
    });

    it("recusa CPF com dígito verificador errado", async () => {
      const { error } = await coordClient!.from("members").insert({
        school_id: schoolId!,
        kind: "student",
        full_name: "CPF Inválido",
        cpf: "11111111111",
        birth_date: "2004-01-01",
      });

      expect(error).not.toBeNull();
    });

    it("recusa CPF duplicado na mesma escola — chave da importação idempotente", async () => {
      const { error } = await coordClient!.from("members").insert({
        school_id: schoolId!,
        kind: "student",
        full_name: "Mesmo CPF",
        cpf: CPF_STUDENT,
        birth_date: "2005-04-12",
      });

      expect(error).not.toBeNull();
      expect(error!.code).toBe("23505");
    });

    it("cria os 4 slots de dependente junto com o aluno", async () => {
      const { error } = await coordClient!.from("students").insert({
        member_id: memberId!,
        school_id: schoolId!,
        enrollment_code: "TST-0001",
        course: "Inglês",
        class_group: "ING-1A",
        source: "manual",
      });
      expect(error).toBeNull();

      const { data: slots } = await coordClient!
        .from("dependent_slots")
        .select("slot_index, slot_type")
        .eq("holder_member_id", memberId!)
        .order("slot_index");

      expect(slots).toHaveLength(4);
      expect(slots!.map((s) => s.slot_type)).toEqual(["free", "free", "paid", "paid"]);
    });

    it("não cadastra aluno em outra escola", async () => {
      const { error } = await coordClient!.from("members").insert({
        school_id: "22222222-0000-0000-0000-00000000000b", // Escola Aurora
        kind: "student",
        full_name: "Invasor",
        cpf: CPF_OTHER,
        birth_date: "2000-01-01",
      });

      expect(error).not.toBeNull();
      expect(error!.code).toBe("42501");
    });

    it("suspender o titular derruba os dependentes junto (D18)", async () => {
      const { data: slot } = await coordClient!
        .from("dependent_slots")
        .select("id")
        .eq("holder_member_id", memberId!)
        .eq("slot_index", 1)
        .single();

      const { data: dep } = await coordClient!
        .from("members")
        .insert({
          school_id: schoolId!,
          kind: "dependent",
          full_name: "Dependente de Teste",
          cpf: CPF_OTHER,
          birth_date: "2014-06-01",
          status: "active",
        })
        .select("id")
        .single();

      await coordClient!.from("dependents").insert({
        member_id: dep!.id,
        slot_id: slot!.id,
        holder_member_id: memberId!,
        school_id: schoolId!,
        relationship: "filho",
        approval_status: "approved",
      });

      await coordClient!.from("members").update({ status: "suspended" }).eq("id", memberId!);

      const { data: after } = await coordClient!
        .from("members")
        .select("status")
        .eq("id", dep!.id)
        .single();

      // A cascata é trigger, não código de aplicação: é a regra que o parceiro
      // precisa que seja verdadeira sempre.
      expect(after!.status).toBe("suspended");
    });
  });
});
