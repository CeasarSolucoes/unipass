import { z } from "zod";

/**
 * Validação de ambiente na borda. Falhar no boot com uma mensagem clara é
 * melhor que falhar na terceira tela com "Invalid API key".
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

function format(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
}

/** Variáveis seguras para o browser. */
export function publicEnv() {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente públicas ausentes ou inválidas:\n${format(parsed.error)}\n` +
        `Copie .env.example para .env.local e preencha.`,
    );
  }

  return parsed.data;
}

/**
 * Variáveis que NUNCA podem chegar ao browser. Chamar isto em Client Component
 * lança na hora, em vez de vazar a service role key em silêncio.
 */
export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() foi chamada no browser. Isto expõe a service role key.");
  }

  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente de servidor ausentes ou inválidas:\n${format(parsed.error)}`,
    );
  }

  return parsed.data;
}
