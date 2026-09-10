import type { Metadata } from "next";
import { PageHeader, Placeholder } from "@/components/ui/page";

export const metadata: Metadata = { title: "Benefícios" };

export default function Page() {
  return (
    <>
      <PageHeader title="Benefícios" description="Desconto, regra de uso, dias e horários válidos." />
      <Placeholder day="Dia 5">Default de 1 uso por dia, por membro (PRD §6.1).</Placeholder>
    </>
  );
}
