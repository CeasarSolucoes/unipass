import type { Metadata } from "next";
import { PageHeader, Placeholder } from "@/components/ui/page";

export const metadata: Metadata = { title: "Minhas unidades" };

export default function Page() {
  return (
    <>
      <PageHeader title="Minhas unidades" description="Consolidado das escolas da rede." />
      <Placeholder day="Semana 2">Só aparece para redes: escola independente não vê este nível (D02).</Placeholder>
    </>
  );
}
