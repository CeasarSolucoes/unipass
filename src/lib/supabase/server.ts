import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente de servidor (Server Components, Server Actions, Route Handlers).
 * Opera sob a RLS do usuário logado — é o caminho padrão.
 */
export async function createClient() {
  // cookies() ANTES de qualquer validação: é a chamada que marca a rota como
  // dinâmica. Se `publicEnv()` lançasse primeiro, o Next tentaria pré-renderizar
  // a página no build e o erro apareceria como falha de prerender, escondendo
  // a causa real.
  const cookieStore = await cookies();
  const env = publicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component não pode escrever cookie. O middleware já
            // renovou a sessão, então ignorar aqui é seguro.
          }
        },
      },
    },
  );
}
