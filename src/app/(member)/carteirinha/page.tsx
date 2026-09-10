import type { Metadata } from "next";
import { PageHeader, Placeholder } from "@/components/ui/page";

export const metadata: Metadata = { title: "Carteirinha" };

export default function Page() {
  return (
    <>
      <PageHeader title="Carteirinha" description="Sua identificação na escola." />
      <Placeholder day="Dia 4">Com a marca da escola e o seu código de membro em destaque.</Placeholder>
    </>
  );
}
