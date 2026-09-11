import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-approved/10 text-approved",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-denied/10 text-denied",
  info: "bg-brand-50 text-brand-900",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Rótulo e cor de cada status que aparece em tabela. Um lugar só. */
export const STATUS_LABEL: Record<string, { label: string; tone: BadgeTone }> = {
  // escola
  trial: { label: "Teste", tone: "info" },
  active: { label: "Ativo", tone: "success" },
  suspended: { label: "Suspenso", tone: "warning" },
  cancelled: { label: "Cancelado", tone: "danger" },
  graduated: { label: "Formado", tone: "neutral" },
  // perfil
  invited: { label: "Convidado", tone: "warning" },
  // foto
  pending: { label: "Aguardando", tone: "warning" },
  approved: { label: "Aprovada", tone: "success" },
  rejected: { label: "Reprovada", tone: "danger" },
};

export function StatusBadge({ status }: { status: string }) {
  const entry = STATUS_LABEL[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}
