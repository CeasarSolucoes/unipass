import type { Metadata } from "next";
import { PageHeader, Placeholder } from "@/components/ui/page";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function Page() {
  return (
    <>
      <PageHeader title="Recuperar senha" description="Enviaremos um link para o seu e-mail." />
      <Placeholder day="Dia 3" />
    </>
  );
}
