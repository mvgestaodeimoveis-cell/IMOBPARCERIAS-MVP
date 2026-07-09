import { env } from '../config/env';

interface EmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Serviço de e-mail transacional.
 * MVP/dev: sem RESEND_API_KEY, os e-mails são apenas logados no console.
 * Produção: envia via API REST do Resend (requer domínio verificado no Resend).
 * Nunca lança — falhas são logadas para não quebrar os fluxos (ex.: recuperação de senha).
 */
export async function sendEmail({ to, subject, html }: EmailInput): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.log(`\n📧 [DEV EMAIL] para: ${to}\n   assunto: ${subject}\n   ${html}\n`);
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(`❌ Resend falhou ao enviar para ${to}: ${res.status} ${detail}`);
      return;
    }
  } catch (err) {
    console.error(`❌ Erro de rede ao enviar e-mail para ${to}:`, err);
  }
}
