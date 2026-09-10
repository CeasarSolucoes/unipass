import type { Metadata } from "next";
import { PageHeader, Placeholder } from "@/components/ui/page";

export const metadata: Metadata = { title: "Cadastro incompleto" };

export default function Page() {
  return (
    <>
      <PageHeader title="Cadastro incompleto" description="Seu acesso existe, mas o cadastro não foi concluído." />
      <Placeholder day="Dia 3">Procure a coordenação da sua escola para reenviar o convite.</Placeholder>
    </>
  );
}
