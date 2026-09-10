import type { Database } from "@/types/database";

export type UserRole = Database["public"]["Enums"]["user_role"];

/**
 * Para onde cada papel vai depois do login.
 *
 * O login é único (PRD §3.1): o usuário digita e-mail e senha, e o sistema
 * descobre o papel. Não existe "escolha seu tipo de acesso" — nas versões
 * anteriores essa tela concentrava tudo e virou um arquivo de 56 KB.
 */
export const HOME_BY_ROLE: Record<UserRole, string> = {
  super_admin: "/admin",
  network_admin: "/rede",
  school_admin: "/escola/alunos",
  school_staff: "/escola/alunos",
  student: "/carteirinha",
  dependent: "/carteirinha",
  partner_owner: "/parceiro/perfil",
  partner_staff: "/validar",
};

/** Prefixo de rota → papéis que podem entrar. */
const ROUTE_ACCESS: ReadonlyArray<readonly [string, readonly UserRole[]]> = [
  ["/admin", ["super_admin"]],
  ["/rede", ["super_admin", "network_admin"]],
  ["/escola", ["super_admin", "school_admin", "school_staff"]],
  ["/parceiro", ["super_admin", "partner_owner"]],
  ["/validar", ["super_admin", "partner_owner", "partner_staff"]],
  ["/carteirinha", ["student", "dependent"]],
  ["/carteira", ["student", "dependent"]],
  ["/beneficios", ["student", "dependent"]],
  ["/historico", ["student", "dependent"]],
  ["/dependentes", ["student"]],
  ["/perfil", ["student", "dependent"]],
];

/** Rotas que dispensam sessão. */
export const PUBLIC_PREFIXES = [
  "/login",
  "/convite",
  "/ativar",
  "/esqueci-senha",
  "/redefinir-senha",
  "/auth",
] as const;

export function isPublicRoute(pathname: string): boolean {
  return pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Guarda de rota. Esta é a segunda linha de defesa, não a primeira: quem
 * realmente protege o dado é a RLS (D32). O middleware só evita que o usuário
 * veja uma tela vazia por falta de permissão.
 */
export function canAccess(pathname: string, role: UserRole): boolean {
  const match = ROUTE_ACCESS.find(([prefix]) => pathname.startsWith(prefix));
  if (!match) return true;
  return match[1].includes(role);
}
