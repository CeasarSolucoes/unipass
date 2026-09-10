/**
 * Diagnóstico de conexão com o Supabase.
 *
 *   node scripts/check-supabase.mjs
 *
 * Responde, em ordem, às perguntas que travam a primeira conexão:
 * o ambiente está preenchido? a URL responde? a RLS está de pé? o seed
 * foi carregado? os usuários de teste conseguem logar?
 *
 * Só precisa da chave publicável (anon). Não escreve nada no banco.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ok = (m, extra = "") => console.log(`  ok    ${m}${extra ? ` — ${extra}` : ""}`);
const bad = (m, extra = "") => console.log(`  FALHA ${m}${extra ? ` — ${extra}` : ""}`);
const warn = (m, extra = "") => console.log(`  aviso ${m}${extra ? ` — ${extra}` : ""}`);

let failures = 0;

console.log("\n1. Ambiente");

if (!URL || !KEY) {
  bad("variáveis ausentes", "preencha .env.local a partir de .env.example");
  process.exit(1);
}
ok("NEXT_PUBLIC_SUPABASE_URL", URL);
ok("chave publicável", `${KEY.slice(0, 20)}…`);

const supabase = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("\n2. Conectividade");
try {
  // Consulta uma tabela real: a raiz /rest/v1/ devolve a spec OpenAPI e é
  // restrita por padrão, então um 401 ali não diz nada sobre a conexão.
  const res = await fetch(`${URL}/rest/v1/schools?select=id&limit=1`, {
    headers: { apikey: KEY },
  });
  if (res.ok) ok("endpoint REST responde", `HTTP ${res.status}`);
  else {
    bad("endpoint REST recusou", `HTTP ${res.status}`);
    failures++;
  }
} catch (e) {
  bad("não foi possível alcançar a URL", e.message);
  process.exit(1);
}

console.log("\n3. RLS com usuário anônimo (D32)");
for (const table of ["members", "validations", "profiles", "schools"]) {
  const { data, error } = await supabase.from(table).select("id").limit(5);

  if (error) {
    // Erro de permissão também é RLS funcionando.
    ok(`${table} bloqueada`, error.code ?? error.message);
  } else if ((data ?? []).length === 0) {
    ok(`${table} devolve vazio`, "sem sessão, nada é visível");
  } else {
    bad(`${table} VAZOU ${data.length} linha(s) para anônimo`);
    failures++;
  }
}

console.log("\n4. Seed");
const seedUsers = [
  ["super@unipass.test", "super_admin"],
  ["coord.sorocaba@knn.test", "school_admin · KNN Sorocaba"],
  ["coord.aurora@aurora.test", "school_admin · Escola Aurora"],
  ["maria.aluna@knn.test", "student"],
  ["dono@cantinasabor.test", "partner_owner"],
  ["rede@knn.test", "network_admin"],
];

let loggedIn = 0;
for (const [email, role] of seedUsers) {
  const client = createClient(URL, KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: "unipass-dev-2026",
  });

  if (error) bad(email, error.message);
  else {
    ok(email, role);
    loggedIn++;
  }
  await client.auth.signOut();
}

if (loggedIn === 0) {
  warn("nenhum usuário do seed logou", "rode supabase/seed.sql no SQL Editor");
  failures++;
} else if (loggedIn < seedUsers.length) {
  warn(`${loggedIn}/${seedUsers.length} usuários logaram`, "seed aplicado parcialmente");
  failures++;
}

console.log("\n5. Leitura autenticada");
if (loggedIn > 0) {
  const client = createClient(URL, KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await client.auth.signInWithPassword({
    email: "coord.sorocaba@knn.test",
    password: "unipass-dev-2026",
  });

  const { data, error } = await client.from("members").select("member_code, full_name, school_id");

  if (error) {
    bad("coordenação não consegue ler os próprios alunos", `${error.code}: ${error.message}`);
    failures++;
  } else {
    ok(`coordenação vê ${data.length} membro(s)`, data.map((m) => m.member_code).join(", "));

    const schools = new Set(data.map((m) => m.school_id));
    if (schools.size > 1) {
      bad("VAZAMENTO ENTRE TENANTS", `${schools.size} escolas visíveis para uma coordenação`);
      failures++;
    } else {
      ok("isolamento de tenant", "só a própria escola");
    }
  }

  await client.auth.signOut();
}

console.log(
  failures === 0
    ? "\nTudo certo. Rode `npm run test` para os 14 casos de isolamento.\n"
    : `\n${failures} problema(s). Resolva antes de seguir para o Dia 3.\n`,
);

process.exit(failures === 0 ? 0 : 1);
