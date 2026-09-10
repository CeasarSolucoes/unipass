import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  info: { cls: "border-brand-500/40 bg-brand-50 text-brand-900", Icon: Info },
  success: { cls: "border-approved/40 bg-approved/10 text-approved", Icon: CheckCircle2 },
  warning: { cls: "border-amber-500/40 bg-amber-50 text-amber-900", Icon: AlertTriangle },
  danger: { cls: "border-denied/40 bg-denied/10 text-denied", Icon: XCircle },
} as const;

type AlertProps = {
  tone?: keyof typeof TONES;
  title?: string;
  children?: React.ReactNode;
  className?: string;
};

export function Alert({ tone = "info", title, children, className }: AlertProps) {
  const { cls, Icon } = TONES[tone];

  return (
    <div
      // Erro e alerta interrompem o leitor de tela; informação apenas se anuncia.
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border p-3 text-sm", cls, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="opacity-90">{children}</div> : null}
      </div>
    </div>
  );
}
