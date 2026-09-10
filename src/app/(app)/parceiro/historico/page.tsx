import type { Metadata } from "next";
import { PageHeader, Placeholder } from "@/components/ui/page";

export const metadata: Metadata = { title: "Histórico" };

export default function Page() {
  return (
    <>
      <PageHeader title="Histórico" description="Todas as validações da loja, com exportação." />
      <Placeholder day="Dia 6">CPF sempre mascarado (D39).</Placeholder>
    </>
  );
}
