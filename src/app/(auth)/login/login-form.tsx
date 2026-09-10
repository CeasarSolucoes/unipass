"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { login, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" block disabled={pending}>
      {pending ? "Entrando…" : "Entrar"}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field
        label="E-mail ou CPF"
        htmlFor="identifier"
        hint="Use o que for mais fácil de lembrar."
      >
        <Input
          id="identifier"
          name="identifier"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          // `inputMode` numérico atrapalharia quem digita e-mail; o parser do
          // servidor aceita os dois formatos sem precisar de máscara aqui.
          required
          aria-invalid={state.error ? true : undefined}
          placeholder="voce@escola.com.br"
        />
      </Field>

      <Field label="Senha" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.error ? true : undefined}
        />
      </Field>

      <SubmitButton />

      <div className="flex items-center justify-between text-sm">
        <Link href="/esqueci-senha" className="text-brand-700 hover:underline">
          Esqueci minha senha
        </Link>
        <Link href="/ativar" className="text-muted-foreground hover:underline">
          Tenho um código
        </Link>
      </div>
    </form>
  );
}
