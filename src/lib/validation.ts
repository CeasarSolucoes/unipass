import { z } from "zod";
import { isValidCpf, onlyDigits } from "@/lib/cpf";

/** Remove acentos e pontuação: "KNN Sorocaba Centro" → "knn-sorocaba-centro". */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Prefixo do member_code a partir do nome da escola.
 *
 * Usa as iniciais das palavras significativas ("KNN Sorocaba Centro" → "KSC").
 * Cai para as primeiras letras quando o nome é de uma palavra só. O resultado
 * é sempre editável na tela: o prefixo aparece na carteirinha e é ditado em voz
 * alta no balcão, então a escola precisa poder escolher.
 */
export function suggestPrefix(name: string): string {
  const stop = new Set(["de", "da", "do", "das", "dos", "e", "the"]);

  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((w) => w.length > 0 && !stop.has(w.toLowerCase()));

  if (words.length === 0) return "ESC";

  const initials = words.map((w) => w.charAt(0)).join("");
  const base = initials.length >= 2 ? initials : (words[0] ?? "").slice(0, 3);

  return base.slice(0, 6);
}

const cpfField = z
  .string()
  .transform(onlyDigits)
  .refine((v) => v.length === 11, "CPF precisa ter 11 dígitos.")
  .refine(isValidCpf, "CPF inválido — confira os números.");

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

export const schoolSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome da escola."),
  slug: z
    .string()
    .trim()
    .min(3, "O identificador é obrigatório.")
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen."),
  memberCodePrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,6}$/, "De 2 a 6 letras ou números, sem espaço."),
  city: optionalText,
  state: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, "Use a sigla do estado, com 2 letras.")
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v)),
  networkId: z.string().uuid().nullable().catch(null),
  planId: z.string().min(1, "Escolha um plano."),
  whatsappNumber: optionalText,

  // Primeiro coordenador — a escola não serve para nada sem alguém que entre nela.
  adminName: z.string().trim().min(3, "Informe o nome do coordenador."),
  adminEmail: z.string().trim().toLowerCase().email("E-mail inválido."),
});

export type SchoolInput = z.infer<typeof schoolSchema>;

export const studentSchema = z.object({
  fullName: z.string().trim().min(3, "Informe o nome completo."),
  cpf: cpfField,
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
    .refine((v) => {
      const date = new Date(`${v}T00:00:00`);
      return date <= new Date() && date >= new Date("1900-01-01");
    }, "Data de nascimento fora do intervalo aceito."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido.")
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v)),
  enrollmentCode: optionalText,
  course: optionalText,
  classGroup: optionalText,
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v)),
});

export type StudentInput = z.infer<typeof studentSchema>;

/** Primeira mensagem de erro do Zod, pronta para exibir. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Confira os dados informados.";
}

/** Erros por campo, para marcar o input certo em vez de um alerta genérico. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
