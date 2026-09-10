import type { Metadata } from "next";
import { PageHeader, Placeholder } from "@/components/ui/page";

export const metadata: Metadata = { title: "Histórico" };

export default function Page() {
  return (
    <>
      <PageHeader title="Histórico" description="Onde você usou e quanto economizou." />
      <Placeholder day="Dia 6">O total acumulado no topo é o número que vende o produto.</Placeholder>
    </>
  );
}
