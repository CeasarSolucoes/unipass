import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn("text-foreground text-sm leading-none font-medium", className)}
      {...props}
    />
  );
}

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "border-border bg-background h-11 w-full rounded-lg border px-3 text-base",
        "placeholder:text-muted-foreground",
        "focus-visible:border-brand-600 focus-visible:ring-brand-600/30 focus-visible:ring-2",
        "outline-none disabled:opacity-50",
        "aria-invalid:border-denied aria-invalid:ring-denied/30",
        className,
      )}
      {...props}
    />
  );
}

type FieldProps = {
  label: string;
  htmlFor: string;
  /** Texto de apoio. Some quando há erro, para não competir com ele. */
  hint?: string;
  error?: string;
  children: React.ReactNode;
};

/**
 * Rótulo, campo, apoio e erro num bloco só — para que ninguém esqueça de
 * ligar o `aria-describedby` e o erro vire um `<p>` vermelho solto na tela.
 */
export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  const describedBy = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <div aria-describedby={describedBy}>{children}</div>
      {error ? (
        <p id={`${htmlFor}-error`} className="text-denied text-sm" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-muted-foreground text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
