"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/** Cliente do browser. Opera sob a RLS do usuário logado. */
export function createClient() {
  const env = publicEnv();
  return createBrowserClient<Database>(env.url, env.publishableKey);
}
