"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "./nav";
import { cn } from "@/lib/utils";

/**
 * Item ativo = rota exata, ou prefixo quando o item tem filhos.
 * Comparar só por `startsWith` acenderia "Alunos" e "Painel" ao mesmo tempo
 * quando o painel é a raiz da área.
 */
function isActive(pathname: string, href: string, allHrefs: readonly string[]): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;

  // Existe um item mais específico que também casa? Então ele é o ativo.
  return !allHrefs.some((other) => other !== href && other.length > href.length && pathname.startsWith(other));
}

export function SidebarNav({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();
  const hrefs = items.map((i) => i.href);

  return (
    <nav aria-label="Navegação principal" className="space-y-0.5">
      {items.map(({ href, label, icon: Icon, soon }) => {
        const active = isActive(pathname, href, hrefs);

        if (soon) {
          return (
            <span
              key={href}
              aria-disabled
              className="text-muted-foreground/60 flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm"
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{label}</span>
              <span className="bg-muted ml-auto rounded px-1.5 py-0.5 text-[10px] tracking-wide uppercase">
                em breve
              </span>
            </span>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-brand-50 text-brand-900 font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
