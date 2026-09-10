import { describe, expect, it } from "vitest";
import { HOME_BY_ROLE, canAccess, isPublicRoute, type UserRole } from "@/lib/roles";

const ALL_ROLES: readonly UserRole[] = [
  "super_admin",
  "network_admin",
  "school_admin",
  "school_staff",
  "student",
  "dependent",
  "partner_owner",
  "partner_staff",
];

describe("HOME_BY_ROLE", () => {
  it("todo papel tem destino, e o destino é acessível a ele", () => {
    for (const role of ALL_ROLES) {
      const home = HOME_BY_ROLE[role];
      expect(home).toBeTruthy();
      // Um destino ao qual o próprio papel não tem acesso vira loop de redirect.
      expect(canAccess(home, role)).toBe(true);
    }
  });
});

describe("isPublicRoute", () => {
  it("libera raiz e fluxos sem sessão", () => {
    for (const path of ["/", "/login", "/convite/abc123", "/ativar", "/esqueci-senha"]) {
      expect(isPublicRoute(path)).toBe(true);
    }
  });

  it("não libera área autenticada", () => {
    for (const path of ["/admin", "/escola/alunos", "/carteirinha", "/validar"]) {
      expect(isPublicRoute(path)).toBe(false);
    }
  });
});

describe("canAccess", () => {
  it("só o super admin entra em /admin", () => {
    expect(canAccess("/admin/escolas", "super_admin")).toBe(true);
    for (const role of ALL_ROLES.filter((r) => r !== "super_admin")) {
      expect(canAccess("/admin", role)).toBe(false);
    }
  });

  it("aluno não entra na área da escola nem na do parceiro", () => {
    expect(canAccess("/escola/alunos", "student")).toBe(false);
    expect(canAccess("/parceiro/perfil", "student")).toBe(false);
    expect(canAccess("/validar", "student")).toBe(false);
  });

  it("escola não entra na carteirinha do aluno", () => {
    expect(canAccess("/carteirinha", "school_admin")).toBe(false);
    expect(canAccess("/historico", "school_admin")).toBe(false);
  });

  it("atendente só chega em /validar — D14", () => {
    expect(canAccess("/validar", "partner_staff")).toBe(true);
    expect(canAccess("/parceiro/perfil", "partner_staff")).toBe(false);
    expect(canAccess("/parceiro/equipe", "partner_staff")).toBe(false);
    expect(canAccess("/parceiro/historico", "partner_staff")).toBe(false);
  });

  it("dono do parceiro valida e administra a própria loja", () => {
    expect(canAccess("/validar", "partner_owner")).toBe(true);
    expect(canAccess("/parceiro/equipe", "partner_owner")).toBe(true);
  });

  it("secretaria não configura a escola", () => {
    expect(canAccess("/escola/alunos", "school_staff")).toBe(true);
    // A guarda de rota é grossa de propósito: quem separa o que a secretaria
    // pode MUDAR é a RLS, não o middleware.
    expect(canAccess("/escola/config", "school_staff")).toBe(true);
  });

  it("admin da rede vê a rede, não edita a escola", () => {
    expect(canAccess("/rede", "network_admin")).toBe(true);
    expect(canAccess("/escola/alunos", "network_admin")).toBe(false);
  });

  it("rota sem regra é liberada — a RLS decide o que aparece", () => {
    expect(canAccess("/notificacoes", "student")).toBe(true);
  });

  it("o prefixo casa no limite do segmento, não no meio da palavra", () => {
    // "/escolas-publicas" não pode herdar a regra de "/escola".
    expect(canAccess("/escola", "school_admin")).toBe(true);
    expect(canAccess("/escola/alunos/123", "school_admin")).toBe(true);
  });
});
