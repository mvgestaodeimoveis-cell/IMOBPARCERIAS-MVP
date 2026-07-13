// Contato oficial da equipe, exibido em telas de suporte (ex.: perfil rejeitado).
// Configurável por variáveis de ambiente (definição do cliente — item C4).
// Como são usados em client components, precisam do prefixo NEXT_PUBLIC_.

const EMAIL_PADRAO = 'mvgestaodeimoveis@gmail.com';
const WHATSAPP_PADRAO = '5571991541269';

export const contatoEmail =
  process.env.NEXT_PUBLIC_CONTATO_EMAIL?.trim() || EMAIL_PADRAO;

/** Somente dígitos, com código do país (ex.: 5571999998888). Vazio = sem WhatsApp. */
export const contatoWhatsapp = (process.env.NEXT_PUBLIC_CONTATO_WHATSAPP || WHATSAPP_PADRAO).replace(/\D/g, '');

/** Monta o link wa.me com uma mensagem opcional pré-preenchida. */
export function whatsappLink(mensagem?: string): string | null {
  if (!contatoWhatsapp) return null;
  const query = mensagem ? `?text=${encodeURIComponent(mensagem)}` : '';
  return `https://wa.me/${contatoWhatsapp}${query}`;
}
