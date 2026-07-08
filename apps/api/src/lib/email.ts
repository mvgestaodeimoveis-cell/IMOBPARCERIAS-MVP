import { env } from '../config/env';

interface EmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Serviço de e-mail transacional.
 * MVP/dev: sem RESEND_API_KEY, os e-mails são apenas logados no console.
 * Produção: plugar o Resend (ou SMTP) aqui quando o remetente estiver definido.
 */
export async function sendEmail({ to, subject, html }: EmailInput): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.log(`\n📧 [DEV EMAIL] para: ${to}\n   assunto: ${subject}\n   ${html}\n`);
    return;
  }

  // TODO: integrar Resend quando EMAIL_FROM/domínio forem confirmados pelo cliente.
  // const resend = new Resend(env.RESEND_API_KEY);
  // await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
  console.log(`📧 [PENDENTE] envio real de e-mail para ${to} (integrar Resend).`);
}
