"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "./nav";
import { cn } from "@/lib/utils";

/**
 * Barra inferior do app do aluno.
 *
 * Mobile-first de verdade: fica no alcance do polegar, respeita a safe area do
 * iPhone e some do fluxo em telas largas, onde a lateral faz mais sentido.
 */
export function BottomNav({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();
  const visible = items.filter((i) => !i.soon);

  return (
    <nav
      aria-label="Navegação"
      className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md">
        {visible.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px]",
                  active ? "text-brand-700 font-medium" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
