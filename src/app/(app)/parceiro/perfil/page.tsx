import type { Metadata } from "next";
import { PageHeader, Placeholder } from "@/components/ui/page";

export const metadata: Metadata = { title: "Meu perfil" };

export default function Page() {
  return (
    <>
      <PageHeader title="Meu perfil" description="Nome, logo, fotos, endereços, contato e horários." />
      <Placeholder day="Dia 5">O que o aluno vê no catálogo.</Placeholder>
    </>
  );
}
