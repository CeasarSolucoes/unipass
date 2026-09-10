import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium",
    "transition-colors outline-none",
    "focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2",
    "focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-brand-700 text-white hover:bg-brand-600",
        secondary: "bg-muted text-foreground hover:bg-border",
        outline: "border border-border bg-transparent hover:bg-muted",
        ghost: "bg-transparent hover:bg-muted",
        danger: "bg-denied text-white hover:opacity-90",
      },
      size: {
        // 44px é o mínimo de alvo de toque. O atendente usa isto com pressa,
        // e o aluno usa no celular — nenhum dos dois merece botão pequeno.
        sm: "h-9 px-3 text-sm [&_svg]:size-4",
        md: "h-11 px-4 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-base [&_svg]:size-5",
        /** Botão do balcão: dedo, pressa, uma mão só. */
        counter: "h-16 w-full px-6 text-lg font-semibold [&_svg]:size-6",
        icon: "size-11 [&_svg]:size-5",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Renderiza no filho (ex.: `<Link>`) em vez de emitir um `<button>`. */
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      // Um <button> dentro de <form> sem type é submit por padrão, e é assim
      // que se envia formulário sem querer.
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
