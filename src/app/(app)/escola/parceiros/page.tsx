import type { Metadata } from "next";
import { PageHeader, Placeholder } from "@/components/ui/page";

export const metadata: Metadata = { title: "Parceiros" };

export default function Page() {
  return (
    <>
      <PageHeader title="Parceiros" description="Convidar em 3 campos, pausar e acompanhar o uso." />
      <Placeholder day="Dia 5">O parceiro completa o próprio perfil — a escola só faz o convite.</Placeholder>
    </>
  );
}
