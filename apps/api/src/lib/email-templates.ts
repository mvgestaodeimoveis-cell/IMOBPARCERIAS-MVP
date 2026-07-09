import { env } from '../config/env';

// Paleta alinhada ao site.
const NAVY = '#16283d';
const EMERALD = '#17a367';
const TEXT = '#1f2937';
const MUTED = '#6b7280';
const BG = '#f4f6f8';
const BORDER = '#e5e7eb';

interface CTA {
  label: string;
  url: string;
}

interface LayoutInput {
  preheader?: string;
  heading: string;
  paragraphs: string[];
  cta?: CTA;
  footerNote?: string;
}

export interface EmailContent {
  subject: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function primeiroNome(nome: string): string {
  const first = nome.trim().split(/\s+/)[0] ?? '';
  return escapeHtml(first);
}

function baseLayout({ preheader, heading, paragraphs, cta, footerNote }: LayoutInput): string {
  const logoUrl = `${env.APP_WEB_URL}/logo-mark.png`;
  const year = new Date().getFullYear();

  const body = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${TEXT};">${p}</p>`,
    )
    .join('');

  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
         <tr><td style="border-radius:10px;background:${EMERALD};">
           <a href="${cta.url}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(
             cta.label,
           )}</a>
         </td></tr>
       </table>`
    : '';

  const fallback = cta
    ? `<p style="margin:0 0 6px;font-size:12px;color:${MUTED};">Se o botão não funcionar, copie e cole este link no navegador:</p>
       <p style="margin:0 0 20px;font-size:12px;word-break:break-all;"><a href="${cta.url}" style="color:${EMERALD};">${cta.url}</a></p>`
    : '';

  const note = footerNote
    ? `<p style="margin:0;font-size:13px;color:${MUTED};">${footerNote}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};">
  ${
    preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>`
      : ''
  }
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER};">
        <tr><td style="background:${NAVY};padding:22px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;"><img src="${logoUrl}" width="40" height="40" alt="" style="display:block;border:0;" /></td>
            <td style="vertical-align:middle;padding-left:12px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#ffffff;">Imob Parcerias</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;">
          <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${NAVY};">${escapeHtml(heading)}</h1>
          ${body}
          ${button}
          ${fallback}
          ${note}
        </td></tr>
        <tr><td style="padding:20px 32px;background:#fafbfc;border-top:1px solid ${BORDER};font-family:Arial,Helvetica,sans-serif;">
          <p style="margin:0;font-size:12px;color:${MUTED};">Imob Parcerias — rede exclusiva de parcerias entre corretores credenciados.</p>
          <p style="margin:6px 0 0;font-size:12px;color:${MUTED};">© ${year} Imob Parcerias. Este é um e-mail automático, não responda.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function emailConfirmacao(nome: string, url: string): EmailContent {
  return {
    subject: 'Confirme seu e-mail — Imob Parcerias',
    html: baseLayout({
      preheader: 'Confirme seu e-mail para ativar seu cadastro.',
      heading: `Olá, ${primeiroNome(nome)}!`,
      paragraphs: [
        'Recebemos seu cadastro na <strong>Imob Parcerias</strong>. Para confirmar que este e-mail é seu, clique no botão abaixo.',
        'A confirmação nos ajuda a manter a rede segura e exclusiva para corretores credenciados.',
      ],
      cta: { label: 'Confirmar meu e-mail', url },
      footerNote: 'Se você não fez este cadastro, pode ignorar este e-mail com segurança.',
    }),
  };
}

export function emailBoasVindas(nome: string, url: string): EmailContent {
  return {
    subject: 'Bem-vindo à Imob Parcerias',
    html: baseLayout({
      preheader: 'Seu e-mail foi confirmado. Vamos completar seu cadastro?',
      heading: `Bem-vindo, ${primeiroNome(nome)}!`,
      paragraphs: [
        'Seu e-mail foi confirmado com sucesso. Que bom ter você na <strong>Imob Parcerias</strong>.',
        'O próximo passo é completar seu cadastro com o CRECI. Após a verificação da nossa equipe, seu perfil fica ativo e você já pode fechar parcerias.',
      ],
      cta: { label: 'Acessar minha conta', url },
      footerNote: 'Qualquer dúvida, estamos à disposição.',
    }),
  };
}

export function emailCreciAprovado(nome: string, url: string): EmailContent {
  return {
    subject: 'Seu cadastro foi aprovado — Imob Parcerias',
    html: baseLayout({
      preheader: 'Seu CRECI foi verificado e seu perfil está ativo.',
      heading: `Cadastro aprovado, ${primeiroNome(nome)}!`,
      paragraphs: [
        'Seu CRECI foi verificado pela nossa equipe e seu perfil agora está <strong>ativo</strong>.',
        'Você já pode acessar a plataforma e começar a se conectar com outros corretores para fechar parcerias.',
      ],
      cta: { label: 'Entrar na plataforma', url },
    }),
  };
}

export function emailCreciRejeitado(nome: string, motivo: string, url: string): EmailContent {
  return {
    subject: 'Sobre o seu cadastro — Imob Parcerias',
    html: baseLayout({
      preheader: 'Precisamos de um ajuste no seu cadastro.',
      heading: `Olá, ${primeiroNome(nome)}`,
      paragraphs: [
        'Analisamos seu cadastro e, por ora, ele <strong>não pôde ser aprovado</strong>.',
        `<strong>Motivo:</strong> ${escapeHtml(motivo)}`,
        'Você pode revisar as informações e falar com a nossa equipe para regularizar.',
      ],
      cta: { label: 'Falar com o suporte', url },
    }),
  };
}

export function emailRecuperacaoSenha(nome: string, url: string): EmailContent {
  return {
    subject: 'Recuperação de senha — Imob Parcerias',
    html: baseLayout({
      preheader: 'Redefina a sua senha de acesso.',
      heading: `Olá, ${primeiroNome(nome)}`,
      paragraphs: [
        'Recebemos um pedido para redefinir a sua senha na <strong>Imob Parcerias</strong>. Clique no botão abaixo para criar uma nova senha.',
      ],
      cta: { label: 'Redefinir minha senha', url },
      footerNote: 'O link expira em breve. Se não foi você que solicitou, ignore este e-mail.',
    }),
  };
}
