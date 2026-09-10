import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * ⚠️ Cliente com service role: IGNORA TODA A RLS.
 *
 * Use apenas onde não há usuário logado a quem atribuir a operação, e sempre
 * filtrando o tenant à mão:
 *   - criação de escola e do primeiro school_admin (super admin)
 *   - job de importação de alunos
 *   - webhook do Asaas
 *
 * Para qualquer coisa que aja em nome de um usuário, use `@/lib/supabase/server`
 * e deixe a RLS trabalhar. O `server-only` acima quebra o build se este módulo
 * for alcançado por um Client Component.
 */
export function createAdminClient() {
  const pub = publicEnv();
  const srv = serverEnv();

  return createSupabaseClient<Database>(pub.NEXT_PUBLIC_SUPABASE_URL, srv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
