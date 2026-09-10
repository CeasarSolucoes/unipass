import type { Metadata } from "next";
import { PageHeader, Placeholder } from "@/components/ui/page";

export const metadata: Metadata = { title: "Visão geral" };

export default function Page() {
  return (
    <>
      <PageHeader title="Visão geral" description="Escolas ativas, alunos, validações e MRR da plataforma." />
      <Placeholder day="Dia 6">Os números só fazem sentido com o piloto rodando — ver PRD §8.1.</Placeholder>
    </>
  );
}
