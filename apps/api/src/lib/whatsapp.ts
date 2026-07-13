import { env } from '../config/env';

interface WhatsappInput {
  to: string | null;
  message: string;
}

/**
 * Envio de WhatsApp transacional (gatilhos do fluxo — Seção 8 do escopo).
 * MVP/dev: sem WHATSAPP_API_URL/TOKEN, as mensagens são apenas logadas no console.
 * Produção: POST genérico para a API do provedor (Twilio/Zenvia/Meta) via REST.
 * Nunca lança — falhas são logadas para não quebrar os fluxos.
 */
export function isWhatsappConfigured(): boolean {
  return Boolean(env.WHATSAPP_API_URL && env.WHATSAPP_API_TOKEN);
}

export async function sendWhatsapp({ to, message }: WhatsappInput): Promise<void> {
  if (!to) return;
  const numero = to.replace(/\D/g, '');
  if (!numero) return;

  if (!isWhatsappConfigured()) {
    console.log(`\n📱 [DEV WHATSAPP] para: ${numero}\n   ${message}\n`);
    return;
  }

  try {
    const res = await fetch(env.WHATSAPP_API_URL as string, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: numero, message }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(`❌ WhatsApp falhou para ${numero}: ${res.status} ${detail}`);
    }
  } catch (err) {
    console.error(`❌ Erro de rede ao enviar WhatsApp para ${numero}:`, err);
  }
}
