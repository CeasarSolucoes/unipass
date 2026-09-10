import type { Metadata } from "next";
import { PageHeader, Placeholder } from "@/components/ui/page";

export const metadata: Metadata = { title: "Equipe" };

export default function Page() {
  return (
    <>
      <PageHeader title="Equipe" description="Atendentes e seus PINs." />
      <Placeholder day="Dia 5">Cada atendente tem PIN próprio: é o que sustenta o cancelamento do D13.</Placeholder>
    </>
  );
}
