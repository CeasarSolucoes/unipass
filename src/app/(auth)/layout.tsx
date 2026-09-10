import { brand } from "@/config/brand";

/** Moldura das telas sem sessão: login, convite, ativação, recuperação. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">{children}</div>
      </main>

      <footer className="text-muted-foreground px-6 pb-8 text-center text-xs">
        {brand.legalName}
      </footer>
    </div>
  );
}
