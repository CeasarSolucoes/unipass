import { z } from "zod";

/**
 * Validação de ambiente na borda. Falhar no boot com uma mensagem clara é
 * melhor que falhar na terceira tela com "Invalid API key".
 *
 * ── Sobre os dois nomes de chave ──────────────────────────────────────────
 * O Supabase está migrando de chaves JWT (`anon` / `service_role`) para o
 * formato novo (`sb_publishable_…` / `sb_secret_…`). Os papéis são os mesmos;
 * muda o formato e o nome.
 *
 * Aceitamos os dois nomes de variável, com o novo tendo precedência. As
 * referências a `process.env` precisam ser literais: o Next substitui
 * `NEXT_PUBLIC_*` em tempo de build por análise estática, e acesso dinâmico
 * (`process.env[nome]`) resultaria em `undefined` no bundle do browser.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  publishableKey: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

const serverSchema = z.object({
  secretKey: z.string().min(20),
});

function format(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
}

/** Chave pública do projeto. Segura no browser — quem protege o dado é a RLS. */
export function publishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Chave de servidor. IGNORA a RLS — nunca prefixe com NEXT_PUBLIC_. */
export function secretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function publicEnv() {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: publishableKey(),
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente públicas ausentes ou inválidas:\n${format(parsed.error)}\n` +
        `Copie .env.example para .env.local e preencha.`,
    );
  }

  return {
    url: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: parsed.data.publishableKey,
    siteUrl: parsed.data.NEXT_PUBLIC_SITE_URL,
  };
}

/**
 * Variáveis que NUNCA podem chegar ao browser. Chamar isto em Client Component
 * lança na hora, em vez de vazar a chave secreta em silêncio.
 */
export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() foi chamada no browser. Isto expõe a chave secreta.");
  }

  const parsed = serverSchema.safeParse({ secretKey: secretKey() });

  if (!parsed.success) {
    throw new Error(
      `Chave secreta do Supabase ausente ou inválida:\n${format(parsed.error)}\n` +
        `Defina SUPABASE_SECRET_KEY em .env.local.`,
    );
  }

  return { secretKey: parsed.data.secretKey };
}
