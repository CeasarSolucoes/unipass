import { BottomNav } from "@/components/layout/bottom-nav";
import { MEMBER_ROLES, NAV_BY_ROLE } from "@/components/layout/nav";
import { requireProfile } from "@/lib/auth";

/** Toda rota atrás de login lê sessão: nunca é estática. */
export const dynamic = "force-dynamic";

/** Shell do aluno e do dependente: mobile-first, barra inferior, PWA. */
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile(MEMBER_ROLES);
  const items = NAV_BY_ROLE[profile.role];

  return (
    <div className="min-h-dvh">
      {/* pb-20 abre espaço para a barra inferior não cobrir o fim do conteúdo. */}
      <main className="mx-auto max-w-md px-4 pt-6 pb-20">{children}</main>
      <BottomNav items={items} />
    </div>
  );
}
