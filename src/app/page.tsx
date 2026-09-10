import Link from "next/link";
import { brand } from "@/config/brand";

/**
 * Placeholder da raiz. A landing B2B de verdade é da semana 2 (PRD §3.1).
 * Quem já está logado nunca chega aqui: o middleware manda para a casa do papel.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm font-medium tracking-wide text-brand-600 uppercase">
          {brand.legalName}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance">{brand.name}</h1>
        <p className="text-muted-foreground text-lg text-pretty">{brand.tagline}</p>
      </div>

      <div>
        <Link
          href="/login"
          className="bg-brand-700 hover:bg-brand-600 inline-flex h-11 items-center rounded-lg px-5 font-medium text-white transition-colors"
        >
          Entrar
        </Link>
      </div>

      <p className="text-muted-foreground text-sm">
        Aluno, escola e parceiro entram pelo mesmo endereço — o sistema reconhece quem é você.
      </p>
    </main>
  );
}
