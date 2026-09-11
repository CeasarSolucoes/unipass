"use client";

import { Send } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { inviteStudent, type InviteState } from "./actions";
import { inviteMessage, whatsappLink } from "@/lib/whatsapp";

function Trigger({ hasEmail }: { hasEmail: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      variant="outline"
      disabled={pending || !hasEmail}
      title={hasEmail ? undefined : "Cadastre um e-mail para este aluno primeiro."}
    >
      <Send />
      {pending ? "Gerando…" : "Convidar"}
    </Button>
  );
}

export function InviteButton({
  memberId,
  memberName,
  email,
  phone,
  schoolName,
}: {
  memberId: string;
  memberName: string;
  email: string | null;
  phone: string | null;
  schoolName: string;
}) {
  const [state, formAction] = useActionState<InviteState, FormData>(inviteStudent, {});

  if (state.link) {
    const wa = whatsappLink(
      phone,
      inviteMessage({ memberName, schoolName, link: state.link }),
    );

    return (
      <div className="space-y-3">
        <CopyField label={`Convite de ${state.memberName ?? memberName}`} value={state.link} />

        {wa ? (
          <Button asChild size="sm" variant="outline">
            <a href={wa} target="_blank" rel="noreferrer">
              Abrir no WhatsApp
            </a>
          </Button>
        ) : (
          <p className="text-muted-foreground text-xs">
            Sem telefone cadastrado — copie o link e envie pelo canal que preferir.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="memberId" value={memberId} />
      <Trigger hasEmail={Boolean(email)} />
      {state.error ? (
        <Alert tone="danger" className="text-xs">
          {state.error}
        </Alert>
      ) : null}
    </form>
  );
}
