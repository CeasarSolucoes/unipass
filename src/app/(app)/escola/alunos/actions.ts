"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createInvite, rollbackAuthUser } from "@/lib/invites";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, studentSchema } from "@/lib/validation";

const SCHOOL_ROLES = ["school_admin", "school_staff"] as const;

export type StudentFormState = {
  error?: string;
  fields?: Record<string, string>;
  created?: { memberId: string; memberCode: string; fullName: string };
};

/**
 * Cadastro individual de aluno.
 *
 * Roda sob a sessão do coordenador, com o cliente normal — a RLS é quem
 * garante que o `school_id` seja o dele. Passar pelo admin client aqui seria
 * mais fácil e desligaria justamente a proteção que existe para isso.
 */
export async function createStudent(
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const profile = await requireProfile(SCHOOL_ROLES);

  if (!profile.schoolId) {
    return { error: "Seu usuário não está vinculado a uma escola." };
  }

  const parsed = studentSchema.safeParse({
    fullName: formData.get("fullName"),
    cpf: formData.get("cpf"),
    birthDate: formData.get("birthDate"),
    email: formData.get("email"),
    enrollmentCode: formData.get("enrollmentCode"),
    course: formData.get("course"),
    classGroup: formData.get("classGroup"),
    validUntil: formData.get("validUntil"),
  });

  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fields: fieldErrors(parsed.error) };
  }

  const input = parsed.data;
  const supabase = await createClient();

  // member_code é gerado por trigger; por isso o select depois do insert.
  const { data: member, error: memberError } = await supabase
    .from("members")
    .insert({
      school_id: profile.schoolId,
      kind: "student",
      full_name: input.fullName,
      cpf: input.cpf,
      birth_date: input.birthDate,
      email: input.email,
      valid_until: input.validUntil,
      status: "active",
    })
    .select("id, member_code, full_name")
    .single();

  if (memberError || !member) {
    if (memberError?.code === "23505") {
      return {
        error: "Já existe um aluno com esse CPF nesta escola.",
        fields: { cpf: "CPF já cadastrado." },
      };
    }
    return { error: memberError?.message ?? "Não foi possível cadastrar o aluno." };
  }

  const { error: studentError } = await supabase.from("students").insert({
    member_id: member.id,
    school_id: profile.schoolId,
    enrollment_code: input.enrollmentCode,
    course: input.course,
    class_group: input.classGroup,
    source: "manual",
  });

  if (studentError) {
    // Sem transação entre os dois inserts: um member órfão bloquearia o CPF
    // numa nova tentativa, com a mensagem errada ("CPF já cadastrado").
    await supabase.from("members").delete().eq("id", member.id);
    return { error: `Não foi possível concluir o cadastro: ${studentError.message}` };
  }

  revalidatePath("/escola/alunos");

  return {
    created: {
      memberId: member.id,
      memberCode: member.member_code,
      fullName: member.full_name,
    },
  };
}

export type InviteState = { error?: string; link?: string; memberName?: string };

/**
 * Gera o convite de um aluno já cadastrado.
 *
 * Separado do cadastro de propósito: a importação em massa cria 200 alunos de
 * uma vez, e os convites saem depois, no ritmo da escola.
 */
export async function inviteStudent(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const profile = await requireProfile(SCHOOL_ROLES);

  const memberId = String(formData.get("memberId") ?? "");
  const typed = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!memberId) return { error: "Aluno não informado." };

  const supabase = await createClient();

  // Lê pelo cliente com RLS: se o membro for de outra escola, não aparece, e
  // o admin client abaixo nunca chega a ser usado com um id alheio.
  const { data: member } = await supabase
    .from("members")
    .select("id, full_name, school_id, profile_id, email")
    .eq("id", memberId)
    .maybeSingle();

  if (!member) return { error: "Aluno não encontrado nesta escola." };
  if (member.profile_id) return { error: "Este aluno já tem acesso." };

  // O e-mail do cadastro é o padrão; o campo do formulário só serve para
  // corrigir na hora, sem obrigar a editar o aluno antes de convidar.
  const email = typed || member.email;
  if (!email) return { error: "Este aluno não tem e-mail cadastrado." };

  const invite = await createInvite({
    email,
    fullName: member.full_name,
    redirectTo: "/convite",
  });

  if (!invite.ok) return { error: invite.error };

  const admin = createAdminClient();

  const { error: profileError } = await admin.from("profiles").insert({
    id: invite.userId,
    role: "student",
    school_id: member.school_id,
    full_name: member.full_name,
    email,
    status: "invited",
  });

  if (profileError) {
    await rollbackAuthUser(invite.userId);
    return { error: `Não foi possível criar o acesso: ${profileError.message}` };
  }

  const { error: linkError } = await admin
    .from("members")
    .update({ profile_id: invite.userId })
    .eq("id", member.id);

  if (linkError) {
    await admin.from("profiles").delete().eq("id", invite.userId);
    await rollbackAuthUser(invite.userId);
    return { error: `Não foi possível vincular o acesso: ${linkError.message}` };
  }

  await admin.from("audit_logs").insert({
    actor_id: profile.id,
    actor_role: profile.role,
    school_id: member.school_id,
    action: "student.invite",
    entity: "members",
    entity_id: member.id,
    after: { email },
  });

  revalidatePath("/escola/alunos");

  return { link: invite.link, memberName: member.full_name };
}
