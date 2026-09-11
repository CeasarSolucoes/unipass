/**
 * Montagem de links wa.me — D12, D38.
 *
 * Funções puras, sem `server-only`: o servidor usa ao gerar a lista de convites
 * da secretaria, e o cliente usa no botão "abrir no WhatsApp". Duplicar o
 * texto da mensagem em dois lugares seria garantia de os dois divergirem.
 *
 * Quem clica é sempre uma pessoa. O servidor nunca dispara: envio automático
 * exigiria a Meta Cloud API, com custo por mensagem e template aprovado.
 */

export function whatsappLink(phone: string | null, message: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");

  // 10 dígitos = DDD + 8. Abaixo disso é telefone incompleto, e o wa.me abre
  // numa conversa com número errado em vez de dar erro.
  if (digits.length < 10) return null;

  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

export function inviteMessage(params: {
  memberName: string;
  schoolName: string;
  link: string;
}): string {
  const firstName = params.memberName.split(/\s+/)[0] ?? params.memberName;

  return [
    `Oi, ${firstName}! Sua carteirinha digital da ${params.schoolName} está pronta.`,
    "",
    "Acesse o link abaixo para criar sua senha e enviar sua foto:",
    params.link,
    "",
    "Com ela você usa os descontos da nossa rede de parceiros.",
  ].join("\n");
}
