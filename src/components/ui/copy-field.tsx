"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Campo de link com botão de copiar.
 *
 * Existe porque o convite volta para a tela em vez de ser só enviado por
 * e-mail (D12): quem opera precisa conseguir levar o link para o WhatsApp sem
 * selecionar texto com o mouse e errar o começo.
 */
export function CopyField({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard exige contexto seguro (https ou localhost). Sem ele, o campo
      // continua selecionável à mão — por isso o input é readOnly, não disabled.
      setCopied(false);
    }
  }

  return (
    <div className="space-y-1.5">
      {label ? <p className="text-sm font-medium">{label}</p> : null}
      <div className="flex gap-2">
        <input
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="border-border bg-muted h-11 min-w-0 flex-1 rounded-lg border px-3 font-mono text-xs"
        />
        <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copiar">
          {copied ? <Check className="text-approved" /> : <Copy />}
        </Button>
      </div>
      <p aria-live="polite" className="text-approved h-4 text-xs">
        {copied ? "Link copiado." : ""}
      </p>
    </div>
  );
}
