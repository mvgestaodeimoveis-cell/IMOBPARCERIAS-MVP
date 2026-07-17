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

export function emailNovoCadastroPendente(
  corretorNome: string,
  creci: string,
  cidade: string,
  url: string,
): EmailContent {
  return {
    subject: 'Novo cadastro aguardando verificação — Imob Parcerias',
    html: baseLayout({
      preheader: 'Um corretor concluiu o cadastro e aguarda verificação de CRECI.',
      heading: 'Novo corretor para verificar',
      paragraphs: [
        'Um corretor concluiu o cadastro na <strong>Imob Parcerias</strong> e está aguardando a verificação do CRECI pela equipe.',
        `<strong>Nome:</strong> ${escapeHtml(corretorNome)}<br /><strong>CRECI:</strong> ${escapeHtml(
          creci,
        )}<br /><strong>Cidade:</strong> ${escapeHtml(cidade)}`,
      ],
      cta: { label: 'Abrir fila de verificação', url },
      footerNote: 'Prazo de análise: até 48h úteis.',
    }),
  };
}

export function emailExclusividadeVencendo(
  nome: string,
  tipo: string,
  bairro: string,
  cidade: string,
  vencimento: string,
  url: string,
): EmailContent {
  return {
    subject: 'Sua exclusividade está próxima do vencimento — Imob Parcerias',
    html: baseLayout({
      preheader: 'Renove a exclusividade antes do vencimento.',
      heading: `Atenção, ${primeiroNome(nome)}`,
      paragraphs: [
        `A exclusividade do imóvel <strong>${escapeHtml(tipo)}</strong> em ${escapeHtml(bairro)}, ${escapeHtml(cidade)} vence em <strong>${escapeHtml(vencimento)}</strong> (em até 15 dias).`,
        'Renove o contrato com o proprietário e atualize o vencimento para manter o selo de exclusividade verificada.',
      ],
      cta: { label: 'Ver o imóvel', url },
    }),
  };
}

export function emailManutencaoImovel(
  nome: string,
  tipo: string,
  bairro: string,
  cidade: string,
  url: string,
  segundoAviso: boolean,
): EmailContent {
  return {
    subject: segundoAviso
      ? 'Último aviso: confirme seu imóvel para não ficar inativo — Imob Parcerias'
      : 'Confirme se seu imóvel ainda está disponível — Imob Parcerias',
    html: baseLayout({
      preheader: 'Mantenha seu imóvel atualizado na vitrine.',
      heading: `Olá, ${primeiroNome(nome)}`,
      paragraphs: [
        `Seu imóvel <strong>${escapeHtml(tipo)}</strong> em ${escapeHtml(bairro)}, ${escapeHtml(cidade)} está há mais de 30 dias sem atualização.`,
        segundoAviso
          ? 'Este é o <strong>segundo e último aviso</strong>: sem confirmação nos próximos dias, o imóvel será marcado como INATIVO e sairá da vitrine.'
          : 'Confirme que ele continua disponível (basta abrir e salvar o anúncio) para mantê-lo ativo na vitrine.',
      ],
      cta: { label: 'Revisar meu imóvel', url },
    }),
  };
}

export function emailImovelDisponivel(
  nome: string,
  tipo: string,
  bairro: string,
  cidade: string,
  url: string,
): EmailContent {
  return {
    subject: 'Um imóvel da sua fila voltou a ficar disponível — Imob Parcerias',
    html: baseLayout({
      preheader: 'Um imóvel que você acompanhava voltou para a vitrine.',
      heading: `Boa notícia, ${primeiroNome(nome)}!`,
      paragraphs: [
        `O imóvel <strong>${escapeHtml(tipo)}</strong> em ${escapeHtml(bairro)}, ${escapeHtml(cidade)} voltou a ficar <strong>disponível</strong> na vitrine.`,
        'Se ainda tiver interesse, você já pode solicitar a parceria novamente.',
      ],
      cta: { label: 'Ver o imóvel', url },
    }),
  };
}

export function emailParceriaCancelada(
  captadorNome: string,
  imovelResumo: string,
  url: string,
): EmailContent {
  return {
    subject: 'Uma solicitação de parceria foi cancelada — Imob Parcerias',
    html: baseLayout({
      preheader: 'O corretor comprador cancelou a solicitação.',
      heading: `Olá, ${primeiroNome(captadorNome)}`,
      paragraphs: [
        `O corretor comprador <strong>cancelou</strong> a solicitação de parceria no seu imóvel <strong>${escapeHtml(imovelResumo)}</strong>.`,
        'Seu imóvel continua disponível na vitrine para novas parcerias.',
      ],
      cta: { label: 'Ver minhas parcerias', url },
    }),
  };
}

export function emailParceriaSolicitada(
  captadorNome: string,
  imovelResumo: string,
  clienteNome: string,
  url: string,
): EmailContent {
  return {
    subject: 'Nova solicitação de parceria — Imob Parcerias',
    html: baseLayout({
      preheader: 'Um corretor quer levar um cliente ao seu imóvel.',
      heading: `Nova parceria, ${primeiroNome(captadorNome)}!`,
      paragraphs: [
        `O corretor comprador solicitou parceria no seu imóvel <strong>${escapeHtml(imovelResumo)}</strong> para o cliente ${escapeHtml(clienteNome)}.`,
        'Aceite para liberar o chat interno e combinar a visita.',
      ],
      cta: { label: 'Ver solicitação', url },
    }),
  };
}

export function emailParceriaAceita(
  compradorNome: string,
  imovelResumo: string,
  url: string,
): EmailContent {
  return {
    subject: 'Sua parceria foi aceita — Imob Parcerias',
    html: baseLayout({
      preheader: 'O chat foi liberado para combinar a visita.',
      heading: `Boa notícia, ${primeiroNome(compradorNome)}!`,
      paragraphs: [
        `O captador aceitou sua parceria no imóvel <strong>${escapeHtml(imovelResumo)}</strong>.`,
        'O chat interno está liberado. Combine a visita e faça a confirmação bilateral para liberar o contato direto.',
      ],
      cta: { label: 'Abrir conversa', url },
    }),
  };
}

export function emailParceriaRecusada(
  compradorNome: string,
  imovelResumo: string,
  motivo: string | null,
  url: string,
): EmailContent {
  return {
    subject: 'Sobre a sua solicitação de parceria — Imob Parcerias',
    html: baseLayout({
      preheader: 'Sua solicitação não pôde ser aceita.',
      heading: `Olá, ${primeiroNome(compradorNome)}`,
      paragraphs: [
        `A solicitação de parceria no imóvel <strong>${escapeHtml(imovelResumo)}</strong> não pôde ser aceita no momento.`,
        motivo ? `<strong>Motivo:</strong> ${escapeHtml(motivo)}` : 'Você pode continuar buscando outros imóveis na vitrine.',
      ],
      cta: { label: 'Ver a vitrine', url },
    }),
  };
}

export function emailVendaDeclarada(
  nome: string,
  imovelResumo: string,
  valor: string,
  url: string,
): EmailContent {
  return {
    subject: 'Venda declarada na parceria — Imob Parcerias',
    html: baseLayout({
      preheader: 'A venda foi registrada na plataforma.',
      heading: `Parabéns, ${primeiroNome(nome)}!`,
      paragraphs: [
        `A venda do imóvel <strong>${escapeHtml(imovelResumo)}</strong> foi declarada por ${valor}.`,
        'Após a confirmação do pagamento da taxa da plataforma, a avaliação mútua será liberada.',
      ],
      cta: { label: 'Ver a parceria', url },
    }),
  };
}

/** Fase 7 — contato liberado após a confirmação bilateral (enviado aos dois). */
export function emailContatoLiberado(
  nome: string,
  imovelResumo: string,
  url: string,
): EmailContent {
  return {
    subject: 'Contato liberado — confirmação concluída',
    html: baseLayout({
      preheader: 'A visita foi confirmada pelos dois lados.',
      heading: `Confirmação concluída, ${primeiroNome(nome)}!`,
      paragraphs: [
        `A confirmação bilateral da parceria no imóvel <strong>${escapeHtml(imovelResumo)}</strong> foi concluída.`,
        'O contato direto entre os corretores está liberado e a janela de proteção de 180 dias foi ativada.',
      ],
      cta: { label: 'Ver a parceria', url },
    }),
  };
}

/** Nova mensagem no chat da parceria (com cooldown — enviado ao destinatário). */
export function emailNovaMensagem(
  destinatarioNome: string,
  remetenteNome: string,
  imovelResumo: string,
  url: string,
): EmailContent {
  return {
    subject: `Nova mensagem de ${primeiroNome(remetenteNome)} — Imob Parcerias`,
    html: baseLayout({
      preheader: `${primeiroNome(remetenteNome)} enviou uma mensagem no chat da parceria.`,
      heading: `Você tem uma nova mensagem, ${primeiroNome(destinatarioNome)}`,
      paragraphs: [
        `<strong>${escapeHtml(primeiroNome(remetenteNome))}</strong> enviou uma mensagem no chat da parceria do imóvel <strong>${escapeHtml(imovelResumo)}</strong>.`,
        'Abra a conversa para ler e responder. (Você recebe no máximo um aviso por período; não avisamos a cada mensagem.)',
      ],
      cta: { label: 'Abrir conversa', url },
    }),
  };
}

/** Visita proposta — avisa o outro corretor para dar o OK (data e hora). */
export function emailVisitaProposta(
  destinatarioNome: string,
  propositorNome: string,
  imovelResumo: string,
  quando: string,
  url: string,
): EmailContent {
  return {
    subject: 'Proposta de data/hora da visita — Imob Parcerias',
    html: baseLayout({
      preheader: `${primeiroNome(propositorNome)} propôs uma data e hora para a visita.`,
      heading: `Confirme a visita, ${primeiroNome(destinatarioNome)}`,
      paragraphs: [
        `<strong>${escapeHtml(primeiroNome(propositorNome))}</strong> propôs a visita ao imóvel <strong>${escapeHtml(imovelResumo)}</strong> para <strong>${escapeHtml(quando)}</strong>.`,
        'Confira com o cliente e confirme (ou proponha outra data/hora) para dar sequência à parceria.',
      ],
      cta: { label: 'Ver e confirmar', url },
    }),
  };
}

/** Fase 8 — cobrança da taxa da plataforma via PIX (enviado ao captador). */
export function emailTaxaPix(
  captadorNome: string,
  imovelResumo: string,
  taxa: string,
  vencimento: string,
  chavePix: string | null,
  url: string,
): EmailContent {
  return {
    subject: 'Taxa da plataforma — pagamento via PIX',
    html: baseLayout({
      preheader: `Taxa de ${taxa} — vence em ${vencimento}.`,
      heading: `Falta pouco, ${primeiroNome(captadorNome)}`,
      paragraphs: [
        `A venda do imóvel <strong>${escapeHtml(imovelResumo)}</strong> foi declarada. A taxa da plataforma é de <strong>${taxa}</strong>, com vencimento em <strong>${vencimento}</strong>.`,
        chavePix
          ? `Pague via PIX para a chave <strong>${escapeHtml(chavePix)}</strong>. A equipe confirma o recebimento em seguida.`
          : 'A chave PIX para pagamento será enviada pela equipe. Assim que pagar, a equipe confirma o recebimento.',
        'A avaliação mútua é liberada após a confirmação do pagamento.',
      ],
      cta: { label: 'Ver a parceria', url },
    }),
  };
}

export function emailPagamentoConfirmado(
  nome: string,
  imovelResumo: string,
  url: string,
): EmailContent {
  return {
    subject: 'Pagamento confirmado — avalie a parceria',
    html: baseLayout({
      preheader: 'A avaliação mútua está liberada.',
      heading: `Tudo certo, ${primeiroNome(nome)}!`,
      paragraphs: [
        `O pagamento referente à parceria do imóvel <strong>${escapeHtml(imovelResumo)}</strong> foi confirmado.`,
        'Que tal avaliar o corretor parceiro? Sua avaliação ajuda a manter a rede confiável.',
      ],
      cta: { label: 'Avaliar parceria', url },
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
