"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isValidCpf, onlyDigits } from "@/lib/cpf";
import { HOME_BY_ROLE } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

const schema = z.object({
  identifier: z.string().trim().min(1, "Informe seu e-mail ou CPF."),
  password: z.string().min(1, "Informe sua senha."),
  next: z.string().optional(),
});

/**
 * Mensagem única para credencial errada, CPF inexistente e e-mail inexistente.
 *
 * Diferenciar "usuário não encontrado" de "senha incorreta" transforma a tela
 * de login num verificador de quem estuda na escola — a mesma enumeração que o
 * D33 combate do lado do parceiro.
 */
const GENERIC_ERROR = "E-mail, CPF ou senha incorretos.";

/**
 * Converte CPF em e-mail para o Supabase Auth, que só conhece e-mail.
 *
 * Usa a service role porque acontece ANTES de existir sessão — não há usuário
 * a quem atribuir a leitura, então a RLS não teria como ajudar. O retorno nunca
 * chega ao cliente: só alimenta o signInWithPassword logo abaixo.
 */
async function resolveEmailFromCpf(cpf: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("profiles")
    .select("email")
    .eq("cpf", cpf)
    .maybeSingle();

  return data?.email ?? null;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  }

  const { identifier, password, next } = parsed.data;

  // Login único (PRD §3.1): o usuário digita o que lembra, o sistema descobre
  // quem ele é. Sem "escolha seu tipo de acesso".
  let email = identifier.toLowerCase();
  const digits = onlyDigits(identifier);

  if (digits.length === 11) {
    if (!isValidCpf(digits)) return { error: GENERIC_ERROR };

    const resolved = await resolveEmailFromCpf(digits);
    if (!resolved) return { error: GENERIC_ERROR };
    email = resolved;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) return { error: GENERIC_ERROR };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  // Autenticado sem perfil = convite pela metade. Não é erro de senha.
  if (!profile) redirect("/convite/pendente");

  // `next` só é aceito como caminho relativo: "//evil.com" e "https://evil.com"
  // são URLs válidas para o browser e viram open redirect.
  const isSafeNext = next && next.startsWith("/") && !next.startsWith("//");

  redirect(isSafeNext ? next : HOME_BY_ROLE[profile.role]);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
