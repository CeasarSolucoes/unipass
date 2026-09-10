import {
  BadgeCheck,
  Building2,
  CreditCard,
  FileClock,
  Gift,
  Handshake,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  ScanLine,
  Settings,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import type { UserRole } from "@/lib/roles";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Ainda não construído — aparece esmaecido, sem link morto. */
  soon?: boolean;
};

/**
 * Navegação por papel.
 *
 * Uma configuração, dois shells. A alternativa — um layout por persona — foi o
 * caminho das versões anteriores, onde cada dashboard virou um arquivo próprio
 * de dezenas de KB que nunca conversou com os outros (D46).
 */
export const NAV_BY_ROLE: Record<UserRole, readonly NavItem[]> = {
  super_admin: [
    { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
    { href: "/admin/escolas", label: "Escolas", icon: Building2 },
    { href: "/admin/parceiros", label: "Parceiros", icon: Store, soon: true },
    { href: "/admin/financeiro", label: "Financeiro", icon: CreditCard, soon: true },
    { href: "/admin/auditoria", label: "Auditoria", icon: FileClock, soon: true },
  ],

  network_admin: [{ href: "/rede", label: "Minhas unidades", icon: Building2 }],

  school_admin: [
    { href: "/escola/alunos", label: "Alunos", icon: Users },
    { href: "/escola/moderacao", label: "Fotos", icon: ImageIcon },
    { href: "/escola/parceiros", label: "Parceiros", icon: Handshake },
    { href: "/escola/solicitacoes", label: "Solicitações", icon: FileClock, soon: true },
    { href: "/escola", label: "Painel", icon: LayoutDashboard, soon: true },
    { href: "/escola/config", label: "Configurações", icon: Settings },
  ],

  school_staff: [
    { href: "/escola/alunos", label: "Alunos", icon: Users },
    { href: "/escola/moderacao", label: "Fotos", icon: ImageIcon },
  ],

  partner_owner: [
    { href: "/validar", label: "Validar", icon: ScanLine },
    { href: "/parceiro/perfil", label: "Meu perfil", icon: Store },
    { href: "/parceiro/beneficios", label: "Benefícios", icon: Gift },
    { href: "/parceiro/equipe", label: "Equipe", icon: Users },
    { href: "/parceiro/historico", label: "Histórico", icon: History },
    { href: "/parceiro", label: "Painel", icon: LayoutDashboard, soon: true },
  ],

  // O atendente vê uma coisa só. É o ponto do D14: a tela dele não tem para
  // onde navegar errado no meio de um atendimento.
  partner_staff: [{ href: "/validar", label: "Validar", icon: ScanLine }],

  student: [
    { href: "/carteirinha", label: "Carteirinha", icon: BadgeCheck },
    { href: "/beneficios", label: "Benefícios", icon: Gift },
    { href: "/historico", label: "Histórico", icon: History },
    { href: "/dependentes", label: "Família", icon: Wallet, soon: true },
  ],

  dependent: [
    { href: "/carteirinha", label: "Carteirinha", icon: BadgeCheck },
    { href: "/beneficios", label: "Benefícios", icon: Gift },
    { href: "/historico", label: "Histórico", icon: History },
  ],
};

/** Papéis que usam o shell mobile com barra inferior, em vez da lateral. */
export const MEMBER_ROLES = ["student", "dependent"] as const;
