import type { Metadata } from "next";
import { PageHeader, Placeholder } from "@/components/ui/page";

export const metadata: Metadata = { title: "Fila de fotos" };

export default function Page() {
  return (
    <>
      <PageHeader title="Fila de fotos" description="Aprovar ou reprovar, sempre com motivo." />
      <Placeholder day="Dia 4">Sem foto aprovada o aluno não valida desconto nenhum (D08).</Placeholder>
    </>
  );
}
