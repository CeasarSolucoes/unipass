import type { Metadata } from "next";
import { PageHeader, Placeholder } from "@/components/ui/page";

export const metadata: Metadata = { title: "Alunos" };

export default function Page() {
  return (
    <>
      <PageHeader title="Alunos" description="Busca, filtro por turma e status, convites e suspensão." />
      <Placeholder day="Dia 3">A tabela e o cadastro individual vêm primeiro; a importação de CSV é do Dia 7.</Placeholder>
    </>
  );
}
