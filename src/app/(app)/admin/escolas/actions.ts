"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createInvite, rollbackAuthUser } from "@/lib/invites";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrors, schoolSchema } from "@/lib/validation";

export type SchoolFormState = {
  error?: string;
  fields?: Record<string, string>;
  created?: { schoolName: string; adminEmail: string; inviteLink: string };
};

/**
 * Cria escola + primeiro coordenador.
 *
 * Usa o admin client porque precisa criar um usuário de auth, o que só a
 * Admin API faz. Em troca, a RLS não protege nada aqui — então a autorização é
 * explícita na primeira linha: só super_admin.
 *
 * Não existe transação atravessando Postgres e GoTrue, então a ordem foi
 * escolhida para que uma falha no meio deixe o menor estrago possível, e o que
 * sobrar seja desfeito na mão.
 */
export async function createSchool(
  _prev: SchoolFormState,
  formData: FormData,
): Promise<SchoolFormState> {
  await requireProfile(["super_admin"]);

  const parsed = schoolSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    memberCodePrefix: formData.get("memberCodePrefix"),
    city: formData.get("city"),
    state: formData.get("state"),
    networkId: formData.get("networkId") || null,
    planId: formData.get("planId"),
    whatsappNumber: formData.get("whatsappNumber"),
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
  });

  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fields: fieldErrors(parsed.error) };
  }

  const input = parsed.data;
  const admin = createAdminClient();

  const { data: plan } = await admin
    .from("plans")
    .select("max_students")
    .eq("id", input.planId)
    .maybeSingle();

  // 1. Escola. Se falhar aqui, nada foi criado.
  const { data: school, error: schoolError } = await admin
    .from("schools")
    .insert({
      name: input.name,
      slug: input.slug,
      member_code_prefix: input.memberCodePrefix,
      city: input.city,
      state: input.state,
      network_id: input.networkId,
      plan_id: input.planId,
      student_limit: plan?.max_students ?? 200,
      whatsapp_number: input.whatsappNumber,
      status: "trial",
    })
    .select("id, name")
    .single();

  if (schoolError || !school) {
    const duplicate = schoolError?.code === "23505";
    return {
      error: duplicate
        ? "Já existe uma escola com esse identificador."
        : (schoolError?.message ?? "Não foi possível criar a escola."),
      fields: duplicate ? { slug: "Escolha outro identificador." } : undefined,
    };
  }

  // 2. Usuário de auth do coordenador.
  const invite = await createInvite({
    email: input.adminEmail,
    fullName: input.adminName,
    redirectTo: "/convite",
  });

  if (!invite.ok) {
    await admin.from("schools").delete().eq("id", school.id);
    return { error: invite.error, fields: { adminEmail: invite.error } };
  }

  // 3. Perfil, que é o que liga o usuário ao tenant. Sem ele o coordenador
  //    loga e não é ninguém — daí o rollback dos dois passos anteriores.
  const { error: profileError } = await admin.from("profiles").insert({
    id: invite.userId,
    role: "school_admin",
    school_id: school.id,
    full_name: input.adminName,
    email: input.adminEmail,
    status: "invited",
  });

  if (profileError) {
    await rollbackAuthUser(invite.userId);
    await admin.from("schools").delete().eq("id", school.id);
    return { error: `Não foi possível criar o coordenador: ${profileError.message}` };
  }

  await admin.from("audit_logs").insert({
    action: "school.create",
    entity: "schools",
    entity_id: school.id,
    school_id: school.id,
    after: { name: school.name, admin: input.adminEmail },
  });

  revalidatePath("/admin/escolas");

  // O link volta para a tela em vez de ir só por e-mail: sem SMTP configurado,
  // um "convite enviado" que não chega é pior que nenhum convite.
  return {
    created: {
      schoolName: school.name,
      adminEmail: input.adminEmail,
      inviteLink: invite.link,
    },
  };
}
