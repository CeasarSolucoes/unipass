import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/roles";

export type SessionProfile = {
  id: string;
  role: UserRole;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  schoolId: string | null;
  networkId: string | null;
  partnerId: string | null;
};

/** Perfil do usuário logado, ou null. Não redireciona. */
export async function getProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();

  // getUser() valida o token no servidor; getSession() apenas lê o cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, avatar_url, school_id, network_id, partner_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    role: data.role,
    fullName: data.full_name,
    email: data.email,
    avatarUrl: data.avatar_url,
    schoolId: data.school_id,
    networkId: data.network_id,
    partnerId: data.partner_id,
  };
}

/**
 * Perfil obrigatório. Use no topo de todo layout autenticado.
 *
 * Isto é conveniência, não segurança: quem impede o acesso ao dado é a RLS
 * (D32). Se esta função falhasse e a página renderizasse, o usuário veria uma
 * tela vazia — nunca dado de outro tenant.
 */
export async function requireProfile(allowed?: readonly UserRole[]): Promise<SessionProfile> {
  const profile = await getProfile();

  if (!profile) redirect("/login");

  if (allowed && !allowed.includes(profile.role)) {
    const { HOME_BY_ROLE } = await import("@/lib/roles");
    redirect(HOME_BY_ROLE[profile.role]);
  }

  return profile;
}
