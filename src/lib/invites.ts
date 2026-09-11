import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";

/**
 * Convites — D12.
 *
 * Usamos `generateLink`, não `inviteUserByEmail`. A diferença importa: o
 * segundo depende de SMTP configurado e some da nossa vista se a entrega
 * falhar. O primeiro devolve a URL, e aí a escola escolhe o canal — e-mail,
 * lista de links wa.me para a secretaria disparar, ou código impresso.
 *
 * No Brasil, WhatsApp abre; e-mail de adolescente, não.
 */

export type InviteResult =
  | { ok: true; userId: string; link: string }
  | { ok: false; error: string };

type InviteOptions = {
  email: string;
  fullName: string;
  /** Para onde o convidado vai depois de definir a senha. */
  redirectTo?: string;
};

export async function createInvite({
  email,
  fullName,
  redirectTo,
}: InviteOptions): Promise<InviteResult> {
  const admin = createAdminClient();
  const { siteUrl } = publicEnv();

  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { full_name: fullName },
      redirectTo: `${siteUrl}${redirectTo ?? "/convite"}`,
    },
  });

  if (error) {
    // O caso mais comum e o mais confuso de depurar: e-mail já convidado antes.
    if (error.message.toLowerCase().includes("already been registered")) {
      return { ok: false, error: "Este e-mail já tem acesso ao sistema." };
    }
    return { ok: false, error: error.message };
  }

  const link = data.properties?.action_link;
  const userId = data.user?.id;

  if (!link || !userId) {
    return { ok: false, error: "O Supabase não devolveu o link de convite." };
  }

  return { ok: true, userId, link };
}

/**
 * Desfaz o usuário de auth criado antes de um passo que falhou.
 *
 * Sem isto, uma escola que falha na metade deixa um e-mail "já registrado" que
 * impede a nova tentativa — e o operador não tem como saber por quê.
 */
export async function rollbackAuthUser(userId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(userId);
  } catch {
    // Melhor esforço: o erro que importa é o original, não o da limpeza.
  }
}
