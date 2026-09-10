/**
 * Fonte única da identidade do produto — D34.
 *
 * O nome "UniPass" é provisório. Nenhum componente escreve o nome do produto
 * direto: trocar a marca precisa ser a edição deste arquivo, não uma varredura
 * no repositório. Se você está prestes a digitar "UniPass" em um .tsx, importe
 * daqui.
 *
 * A carteirinha é white-label (D35): a marca em destaque é a da ESCOLA, e o
 * produto aparece discreto no rodapé via `brand.poweredBy`.
 */

export const brand = {
  /** Nome curto, usado em títulos e no rodapé. */
  name: "UniPass",

  /** Nome completo, usado em documentos legais e e-mails. */
  legalName: "UniPass Tecnologia",

  /** Uma linha, para landing e meta description. */
  tagline: "A carteirinha digital que conecta seus alunos à rede de parceiros da escola.",

  /** Assinatura discreta no rodapé da carteirinha white-label. */
  poweredBy: "by UniPass",

  /** Sem domínio próprio ainda — roda no subdomínio da Vercel (PRD §16). */
  domain: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  support: {
    email: "suporte@unipass.test",
    whatsapp: "",
  },

  /**
   * Paleta do produto (a da escola vem de `schools.brand_color` e sobrescreve
   * o acento nas telas do aluno).
   */
  colors: {
    brand: "#1D4ED8",
    /** Verde da tela de validação aprovada — PRD §5.5. */
    approved: "#15803D",
    /** Vermelho da tela de recusa. */
    denied: "#B91C1C",
  },

  /**
   * Versão dos documentos legais. Bater com `consents.doc_version` (D42):
   * mudou o texto, sobe a versão e o aceite é pedido de novo.
   */
  legalVersion: "2026-09-10",
} as const;

export type Brand = typeof brand;
