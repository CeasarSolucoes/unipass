import type { Metadata } from "next";
import { PageHeader, Placeholder } from "@/components/ui/page";

export const metadata: Metadata = { title: "Ativar com código" };

export default function Page() {
  return (
    <>
      <PageHeader title="Ativar com código" description="Use o código que a escola entregou em sala." />
      <Placeholder day="Dia 3">Alternativa para quem não recebeu o convite por e-mail ou WhatsApp.</Placeholder>
    </>
  );
}
