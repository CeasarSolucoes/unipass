import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page";
import { requireProfile } from "@/lib/auth";
import { StudentForm } from "./student-form";

export const metadata: Metadata = { title: "Novo aluno" };

export default async function NewStudentPage() {
  await requireProfile(["school_admin", "school_staff"]);

  return (
    <>
      <PageHeader
        title="Novo aluno"
        description="O código da carteirinha é gerado automaticamente."
      />
      <StudentForm />
    </>
  );
}
