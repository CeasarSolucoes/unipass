import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <>
      <div className="space-y-2">
        <p className="text-brand-700 text-sm font-semibold tracking-wide uppercase">
          {brand.name}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="text-muted-foreground text-sm text-pretty">
          Aluno, escola e parceiro usam o mesmo acesso.
        </p>
      </div>

      <LoginForm next={next} />
    </>
  );
}
