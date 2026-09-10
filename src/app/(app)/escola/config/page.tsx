import type { Metadata } from "next";
import { PageHeader, Placeholder } from "@/components/ui/page";

export const metadata: Metadata = { title: "Configurações" };

export default function Page() {
  return (
    <>
      <PageHeader title="Configurações" description="Logo, cores, política de dependentes e tetos de promoção." />
      <Placeholder day="Dia 4">É aqui que a escola escolhe o modo de captura de valor (D15).</Placeholder>
    </>
  );
}
