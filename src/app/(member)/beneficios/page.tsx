import type { Metadata } from "next";
import { PageHeader, Placeholder } from "@/components/ui/page";

export const metadata: Metadata = { title: "Benefícios" };

export default function Page() {
  return (
    <>
      <PageHeader title="Benefícios" description="Descontos da sua escola." />
      <Placeholder day="Dia 6">Busca, categorias e destaque de promoções.</Placeholder>
    </>
  );
}
