"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { Field, Input, Label } from "@/components/ui/field";
import { slugify, suggestPrefix } from "@/lib/validation";
import { createSchool, type SchoolFormState } from "../actions";

type Option = { id: string; name: string };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Criando…" : "Criar escola e convidar coordenador"}
    </Button>
  );
}

export function SchoolForm({ plans, networks }: { plans: Option[]; networks: Option[] }) {
  const [state, formAction] = useActionState<SchoolFormState, FormData>(createSchool, {});

  // Slug e prefixo são derivados do nome, mas continuam editáveis: o prefixo
  // aparece na carteirinha e é ditado em voz alta no balcão, então a escola
  // precisa poder escolher. Depois que o operador mexe, paramos de sobrescrever.
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [prefix, setPrefix] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [prefixTouched, setPrefixTouched] = useState(false);

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
    if (!prefixTouched) setPrefix(suggestPrefix(value));
  }

  const err = (field: string) => state.fields?.[field];

  if (state.created) {
    return (
      <div className="space-y-6">
        <Alert tone="success" title={`${state.created.schoolName} foi criada.`}>
          O coordenador ainda não tem senha. Ele só entra pelo link abaixo.
        </Alert>

        <CopyField
          label={`Link de convite para ${state.created.adminEmail}`}
          value={state.created.inviteLink}
        />

        <Alert tone="warning" title="O link não foi enviado por e-mail.">
          Ainda não há SMTP configurado no projeto. Envie você mesmo — um convite que o sistema diz
          ter enviado e não chega é pior que nenhum convite.
        </Alert>

        <div className="flex gap-3">
          <Button asChild>
            <Link href="/admin/escolas">Ver escolas</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/escolas/nova">Criar outra</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="max-w-xl space-y-8">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <section className="space-y-5">
        <h2 className="text-sm font-semibold tracking-wide uppercase">Dados da escola</h2>

        <Field label="Nome" htmlFor="name" error={err("name")}>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            required
            placeholder="KNN Idiomas Sorocaba Centro"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Identificador"
            htmlFor="slug"
            hint="Aparece na URL."
            error={err("slug")}
          >
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              required
            />
          </Field>

          <Field
            label="Prefixo do código"
            htmlFor="memberCodePrefix"
            hint={`Carteirinhas: ${prefix || "XXX"}-7F4K2`}
            error={err("memberCodePrefix")}
          >
            <Input
              id="memberCodePrefix"
              name="memberCodePrefix"
              value={prefix}
              onChange={(e) => {
                setPrefixTouched(true);
                setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
              }}
              required
              maxLength={6}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-[1fr_6rem]">
          <Field label="Cidade" htmlFor="city" error={err("city")}>
            <Input id="city" name="city" placeholder="Sorocaba" />
          </Field>
          <Field label="UF" htmlFor="state" error={err("state")}>
            <Input id="state" name="state" maxLength={2} placeholder="SP" />
          </Field>
        </div>

        <Field
          label="WhatsApp da secretaria"
          htmlFor="whatsappNumber"
          hint="Destino dos avisos da fila de dependentes."
          error={err("whatsappNumber")}
        >
          <Input id="whatsappNumber" name="whatsappNumber" placeholder="15999990000" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="planId">Plano</Label>
            <select
              id="planId"
              name="planId"
              required
              defaultValue={plans[0]?.id}
              className="border-border bg-background h-11 w-full rounded-lg border px-3 text-base"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="networkId">Rede</Label>
            <select
              id="networkId"
              name="networkId"
              defaultValue=""
              className="border-border bg-background h-11 w-full rounded-lg border px-3 text-base"
            >
              {/* D02: independente é a primeira opção porque é o caso comum. */}
              <option value="">Independente</option>
              {networks.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold tracking-wide uppercase">Primeiro coordenador</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Escola sem coordenador não serve para nada — ninguém entra nela.
          </p>
        </div>

        <Field label="Nome" htmlFor="adminName" error={err("adminName")}>
          <Input id="adminName" name="adminName" required placeholder="Maria Coordenadora" />
        </Field>

        <Field label="E-mail" htmlFor="adminEmail" error={err("adminEmail")}>
          <Input
            id="adminEmail"
            name="adminEmail"
            type="email"
            required
            placeholder="coordenacao@escola.com.br"
          />
        </Field>
      </section>

      <div className="flex gap-3">
        <Submit />
        <Button asChild variant="ghost" size="lg">
          <Link href="/admin/escolas">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
