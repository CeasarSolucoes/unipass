import { requireProfile } from "@/lib/auth";

/** Toda rota atrás de login lê sessão: nunca é estática. */
export const dynamic = "force-dynamic";

/**
 * Shell do balcão — deliberadamente vazio.
 *
 * Sem menu, sem cabeçalho, sem nada para onde navegar errado. A tela de
 * validação ocupa tudo (PRD §5.5): o atendente está com o cliente na frente e
 * precisa ler verde ou vermelho em dois segundos.
 */
export default async function CounterLayout({ children }: { children: React.ReactNode }) {
  await requireProfile(["partner_owner", "partner_staff", "super_admin"]);

  return <div className="min-h-dvh">{children}</div>;
}
