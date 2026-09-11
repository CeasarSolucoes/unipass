"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { formatCpf } from "@/lib/cpf";
import { createStudent, type StudentFormState } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Cadastrando…" : "Cadastrar aluno"}
    </Button>
  );
}

export function StudentForm() {
  const [state, formAction] = useActionState<StudentFormState, FormData>(createStudent, {});
  const err = (f: string) => state.fields?.[f];

  if (state.created) {
    return (
      <div className="max-w-xl space-y-6">
        <Alert tone="success" title={`${state.created.fullName} foi cadastrado(a).`}>
          Código da carteirinha:{" "}
          <code className="bg-approved/10 rounded px-1.5 py-0.5 font-mono font-semibold">
            {state.created.memberCode}
          </code>
        </Alert>

        <Alert tone="info" title="O aluno ainda não tem acesso.">
          O cadastro e o convite são passos separados — na importação em massa, a escola cria
          centenas de alunos e dispara os convites depois, no próprio ritmo. Convide pela lista de
          alunos quando quiser.
        </Alert>

        <div className="flex gap-3">
          <Button asChild>
            <Link href="/escola/alunos">Ver alunos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/escola/alunos/novo">Cadastrar outro</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field label="Nome completo" htmlFor="fullName" error={err("fullName")}>
        <Input id="fullName" name="fullName" required autoComplete="off" />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="CPF"
          htmlFor="cpf"
          hint="Serve para validar o desconto no balcão."
          error={err("cpf")}
        >
          <Input
            id="cpf"
            name="cpf"
            required
            inputMode="numeric"
            maxLength={14}
            placeholder="000.000.000-00"
            // Máscara na saída do campo, não a cada tecla: mascarar durante a
            // digitação briga com quem cola o CPF já formatado.
            onBlur={(e) => {
              e.currentTarget.value = formatCpf(e.currentTarget.value);
            }}
          />
        </Field>

        <Field label="Data de nascimento" htmlFor="birthDate" error={err("birthDate")}>
          <Input id="birthDate" name="birthDate" type="date" required />
        </Field>
      </div>

      <Field
        label="E-mail"
        htmlFor="email"
        hint="Opcional agora, obrigatório para convidar."
        error={err("email")}
      >
        <Input id="email" name="email" type="email" autoComplete="off" />
      </Field>

      <div className="grid gap-6 sm:grid-cols-3">
        <Field label="Matrícula" htmlFor="enrollmentCode" error={err("enrollmentCode")}>
          <Input id="enrollmentCode" name="enrollmentCode" />
        </Field>
        <Field label="Curso" htmlFor="course" error={err("course")}>
          <Input id="course" name="course" placeholder="Inglês" />
        </Field>
        <Field label="Turma" htmlFor="classGroup" error={err("classGroup")}>
          <Input id="classGroup" name="classGroup" placeholder="ING-4B" />
        </Field>
      </div>

      <Field
        label="Carteirinha válida até"
        htmlFor="validUntil"
        hint="Vencida, ela para de valer sozinha — sem depender de alguém lembrar de suspender."
        error={err("validUntil")}
      >
        <Input id="validUntil" name="validUntil" type="date" />
      </Field>

      <div className="flex gap-3">
        <Submit />
        <Button asChild variant="ghost" size="lg">
          <Link href="/escola/alunos">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
