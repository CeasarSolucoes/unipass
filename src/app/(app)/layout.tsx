import { NAV_BY_ROLE } from "@/components/layout/nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { brand } from "@/config/brand";
import { requireProfile } from "@/lib/auth";

/** Toda rota atrás de login lê sessão: nunca é estática. */
export const dynamic = "force-dynamic";

/**
 * Shell de trabalho: super admin, rede, escola e dono do parceiro.
 *
 * O aluno tem outro shell (mobile, barra inferior) e o atendente não tem shell
 * nenhum — a tela do balcão é inteira. Um layout por contexto de uso, não por
 * papel: são três, não oito.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const items = NAV_BY_ROLE[profile.role];

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="border-border bg-muted/30 flex shrink-0 flex-col gap-6 border-b p-4 lg:w-64 lg:border-r lg:border-b-0 lg:p-6">
        <div className="flex items-center justify-between gap-4">
          <span className="text-brand-700 text-sm font-semibold tracking-wide uppercase">
            {brand.name}
          </span>
        </div>

        {/* Em telas estreitas a lista rola na horizontal em vez de virar
            gaveta: menos JS, e o alvo de toque continua grande. */}
        <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
          <div className="flex min-w-max gap-1 lg:min-w-0 lg:flex-col lg:gap-0">
            <SidebarNav items={items} />
          </div>
        </div>

        <div className="mt-auto hidden lg:block">
          <UserMenu profile={profile} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border flex items-center justify-end border-b px-4 py-3 lg:hidden">
          <UserMenu profile={profile} />
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
