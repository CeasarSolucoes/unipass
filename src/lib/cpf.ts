/**
 * CPF — espelho em TypeScript de `public.is_valid_cpf` (migration 000).
 *
 * As duas implementações existem de propósito: o banco é a autoridade, e o
 * cliente valida antes de mandar para dar erro imediato no formulário e no
 * preview da importação. Se mudar a regra, mude nos dois lugares.
 */

/** Remove tudo que não é dígito. Espelha `public.only_digits`. */
export function onlyDigits(input: string): string {
  return input.replace(/\D/g, "");
}

function checkDigit(digits: string, length: number): number {
  let total = 0;
  for (let i = 0; i < length; i++) {
    total += Number(digits.charAt(i)) * (length + 1 - i);
  }
  const result = 11 - (total % 11);
  return result >= 10 ? 0 : result;
}

/**
 * Valida CPF pelo dígito verificador.
 *
 * Rejeita sequências repetidas (111.111.111-11 e afins): elas passam no cálculo
 * mas não existem na Receita. É o furo clássico de quem valida só pela conta.
 */
export function isValidCpf(input: string): boolean {
  const digits = onlyDigits(input);

  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  return (
    checkDigit(digits, 9) === Number(digits.charAt(9)) &&
    checkDigit(digits, 10) === Number(digits.charAt(10))
  );
}

/** `12345678909` → `123.456.789-09`. Uso interno da escola e do aluno. */
export function formatCpf(input: string): string {
  const d = onlyDigits(input);
  if (d.length !== 11) return input;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * `12345678909` → `***.456.789-**`
 *
 * D39: é assim que o CPF aparece em QUALQUER tela do parceiro. O atendente
 * digitou o número, então o conhece naquele instante — mas o sistema nunca o
 * devolve, nem no histórico.
 */
export function maskCpf(input: string): string {
  const d = onlyDigits(input);
  if (d.length !== 11) return "***.***.***-**";
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

/** Aceita CPF ou member_code no mesmo campo do balcão — D06. */
export type MemberIdentifier =
  | { kind: "cpf"; value: string }
  | { kind: "member_code"; value: string }
  | { kind: "invalid"; value: string };

const MEMBER_CODE_RE = /^[A-Z0-9]{2,6}-[A-Z0-9]{5}$/;

/**
 * Descobre o que o atendente digitou.
 *
 * A heurística é simples de propósito: 11 dígitos é CPF, qualquer outra coisa
 * é tentada como código. Se o atendente digitar o código sem o hífen, a gente
 * insere — é o erro de digitação mais comum no balcão.
 */
export function parseMemberIdentifier(raw: string): MemberIdentifier {
  const trimmed = raw.trim();
  const digits = onlyDigits(trimmed);

  if (digits.length === 11) {
    return isValidCpf(digits) ? { kind: "cpf", value: digits } : { kind: "invalid", value: trimmed };
  }

  let code = trimmed.toUpperCase().replace(/\s/g, "");
  if (!code.includes("-") && code.length >= 7 && code.length <= 11) {
    code = `${code.slice(0, code.length - 5)}-${code.slice(code.length - 5)}`;
  }

  return MEMBER_CODE_RE.test(code)
    ? { kind: "member_code", value: code }
    : { kind: "invalid", value: trimmed };
}
