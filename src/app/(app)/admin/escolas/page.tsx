import type { Metadata } from "next";
import { PageHeader, Placeholder } from "@/components/ui/page";

export const metadata: Metadata = { title: "Escolas" };

export default function Page() {
  return (
    <>
      <PageHeader title="Escolas" description="Cadastro, plano, limite de alunos e impersonação." />
      <Placeholder day="Dia 3">É por aqui que a primeira escola do piloto entra no ar.</Placeholder>
    </>
  );
}
