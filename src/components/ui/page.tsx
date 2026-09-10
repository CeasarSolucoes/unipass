import { Construction } from "lucide-react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {description ? (
          <p className="text-muted-foreground text-sm text-pretty">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

/**
 * Marcador honesto de tela ainda não construída, com o dia do roadmap.
 *
 * Existe para que o redirect por papel funcione ponta a ponta desde o Dia 2 sem
 * fingir que a tela está pronta — e para que ninguém precise adivinhar se a
 * tela quebrou ou ainda não nasceu.
 */
export function Placeholder({ day, children }: { day: string; children?: React.ReactNode }) {
  return (
    <div className="border-border text-muted-foreground rounded-xl border border-dashed p-8 text-center">
      <Construction className="mx-auto mb-3 size-6" aria-hidden />
      <p className="text-sm font-medium">Em construção — {day}</p>
      {children ? <p className="mx-auto mt-1 max-w-sm text-sm text-pretty">{children}</p> : null}
    </div>
  );
}
