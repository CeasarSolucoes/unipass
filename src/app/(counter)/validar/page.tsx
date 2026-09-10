import type { Metadata } from "next";
import { PageHeader, Placeholder } from "@/components/ui/page";

export const metadata: Metadata = { title: "Validar" };

export default function Page() {
  return (
    <>
      <PageHeader title="Validar" description="Digite o CPF ou o código do cliente." />
      <Placeholder day="Dia 5">O coração do produto: PIN, identificador, tela verde ou vermelha.</Placeholder>
    </>
  );
}
