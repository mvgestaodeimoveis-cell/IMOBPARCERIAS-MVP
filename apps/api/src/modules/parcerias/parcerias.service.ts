import { pool, query } from '../../db/pool';
import { env } from '../../config/env';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors';
import { sendEmail } from '../../lib/email';
import { sendWhatsapp } from '../../lib/whatsapp';
import { calcularComissaoTaxa } from '../../lib/comissao';
import {
  emailImovelDisponivel,
  emailPagamentoConfirmado,
  emailParceriaAceita,
  emailParceriaRecusada,
  emailParceriaSolicitada,
  emailVendaDeclarada,
} from '../../lib/email-templates';
import { TERMO_PARCERIA_VERSAO } from '../../lib/termo-parceria';
import { gerarContratoParceria } from '../../lib/contrato-parceria';
import type { SolicitarParceriaInput } from './parcerias.schemas';

const JANELA_DIAS = 180;

const TIPO_LABEL: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  terreno: 'Terreno',
  comercial: 'Imóvel comercial',
};

function resumoImovel(p: { imovel_tipo: string; imovel_bairro: string; imovel_cidade: string }): string {
  return `${TIPO_LABEL[p.imovel_tipo] ?? p.imovel_tipo} em ${p.imovel_bairro}, ${p.imovel_cidade}`;
}

/** Avisa o captador (e-mail) de uma nova solicitação de parceria. */
async function notificarSolicitacao(parceriaId: string, captadorId: string, clienteNome: string): Promise<void> {
  const { rows } = await query<{ nome: string; email: string; whatsapp: string | null; imovel_tipo: string; imovel_bairro: string; imovel_cidade: string }>(
    `SELECT c.nome, c.email, c.whatsapp, i.tipo AS imovel_tipo, i.bairro AS imovel_bairro, i.cidade AS imovel_cidade
     FROM parceria p JOIN corretor c ON c.id = $2 JOIN imovel i ON i.id = p.imovel_id
     WHERE p.id = $1`,
    [parceriaId, captadorId],
  );
  const d = rows[0];
  if (!d) return;
  const url = `${env.APP_WEB_URL}/parcerias/${parceriaId}`;
  await sendEmail({ to: d.email, ...emailParceriaSolicitada(d.nome, resumoImovel(d), clienteNome, url) });
  await sendWhatsapp({
    to: d.whatsapp,
    message: `Imob Parcerias: nova solicitação de parceria no seu imóvel (${resumoImovel(d)}) para o cliente ${clienteNome}. Acesse: ${url}`,
  });
}

async function garantirCorretorAtivo(corretorId: string): Promise<void> {
  const { rows } = await query<{ status: string }>(
    'SELECT status FROM corretor WHERE id = $1',
    [corretorId],
  );
  if (!rows[0]) throw notFound('Corretor não encontrado.');
  if (rows[0].status !== 'ativo') {
    throw forbidden('Seu perfil precisa estar ativo para solicitar parcerias.');
  }
}

export interface ParceriaResumo {
  id: string;
  imovel_id: string;
  status: string;
  cliente_nome: string;
  janela_dias: number;
  criado_em: string;
  imovel_tipo: string;
  imovel_bairro: string;
  imovel_cidade: string;
  imovel_preco: number;
  captador_nome: string;
  comprador_nome: string;
  recusa_motivo: string | null;
}

interface ParceriaRow extends Omit<ParceriaResumo, 'imovel_preco'> {
  imovel_preco: string;
}

const RESUMO_SELECT = `
  p.id, p.imovel_id, p.status, p.cliente_nome, p.janela_dias, p.criado_em,
  p.recusa_motivo,
  i.tipo AS imovel_tipo, i.bairro AS imovel_bairro, i.cidade AS imovel_cidade,
  i.preco::text AS imovel_preco,
  cap.nome AS captador_nome, comp.nome AS comprador_nome
`;

const RESUMO_JOINS = `
  FROM parceria p
  JOIN imovel i ON i.id = p.imovel_id
  JOIN corretor cap ON cap.id = p.captador_id
  JOIN corretor comp ON comp.id = p.comprador_id
`;

function mapResumo(r: ParceriaRow): ParceriaResumo {
  return { ...r, imovel_preco: Number(r.imovel_preco) };
}

/** Fase 6 — corretor-comprador solicita parceria; gera contrato inicial. */
export async function solicitarParceria(compradorId: string, input: SolicitarParceriaInput) {
  await garantirCorretorAtivo(compradorId);

  const imovelRes = await query<{ corretor_id: string; status: string }>(
    'SELECT corretor_id, status FROM imovel WHERE id = $1',
    [input.imovel_id],
  );
  const imovel = imovelRes.rows[0];
  if (!imovel) throw notFound('Imóvel não encontrado.');
  if (imovel.corretor_id === compradorId) {
    throw forbidden('Você não pode solicitar parceria no seu próprio imóvel.');
  }
  if (imovel.status !== 'ativo') {
    throw conflict('Este imóvel não está disponível para novas parcerias.');
  }

  try {
    const { rows } = await query<{ id: string; status: string }>(
      `INSERT INTO parceria
         (imovel_id, captador_id, comprador_id, cliente_nome, perfil_confirmado,
          contrato_versao, janela_dias)
       VALUES ($1, $2, $3, $4, true, $5, $6)
       RETURNING id, status`,
      [input.imovel_id, imovel.corretor_id, compradorId, input.cliente_nome, TERMO_PARCERIA_VERSAO, JANELA_DIAS],
    );
    const parceriaId = rows[0].id;
    await notificarSolicitacao(parceriaId, imovel.corretor_id, input.cliente_nome);
    return { id: parceriaId, status: rows[0].status };
  } catch (err) {
    if (err && typeof err === 'object' && (err as { code?: string }).code === '23505') {
      throw conflict('Você já tem uma solicitação de parceria em aberto para este imóvel.');
    }
    throw err;
  }
}

/** Parcerias recebidas (o corretor é o captador/dono do imóvel). */
export async function listarRecebidas(captadorId: string) {
  const { rows } = await query<ParceriaRow>(
    `SELECT ${RESUMO_SELECT} ${RESUMO_JOINS}
     WHERE p.captador_id = $1
     ORDER BY p.criado_em DESC`,
    [captadorId],
  );
  return { data: rows.map(mapResumo) };
}

/** Parcerias enviadas (o corretor é o comprador/solicitante). */
export async function listarEnviadas(compradorId: string) {
  const { rows } = await query<ParceriaRow>(
    `SELECT ${RESUMO_SELECT} ${RESUMO_JOINS}
     WHERE p.comprador_id = $1
     ORDER BY p.criado_em DESC`,
    [compradorId],
  );
  return { data: rows.map(mapResumo) };
}

/** Captador aceita a parceria → chat liberado (Fase 7). */
export async function aceitarParceria(parceriaId: string, captadorId: string) {
  const p = await buscarParceriaFull(parceriaId);
  if (p.captador_id !== captadorId) throw forbidden('Acesso negado.');
  if (p.status !== 'solicitada') throw conflict('Esta parceria já foi processada.');
  await query(
    `UPDATE parceria SET status = 'aceita', atualizado_em = now() WHERE id = $1`,
    [parceriaId],
  );
  await sendEmail({
    to: p.comprador_email,
    ...emailParceriaAceita(p.comprador_nome, resumoImovel(p), `${env.APP_WEB_URL}/parcerias/${parceriaId}`),
  });
  await sendWhatsapp({
    to: p.comprador_whatsapp,
    message: `Imob Parcerias: sua parceria (${resumoImovel(p)}) foi aceita! O chat está liberado: ${env.APP_WEB_URL}/parcerias/${parceriaId}`,
  });
  return { id: parceriaId, status: 'aceita' as const };
}

/** Captador recusa a parceria (o imóvel permanece DISPONÍVEL). */
export async function recusarParceria(parceriaId: string, captadorId: string, motivo?: string) {
  const p = await buscarParceriaFull(parceriaId);
  if (p.captador_id !== captadorId) throw forbidden('Acesso negado.');
  if (p.status !== 'solicitada') throw conflict('Esta parceria já foi processada.');
  await query(
    `UPDATE parceria SET status = 'recusada', recusa_motivo = $2, atualizado_em = now() WHERE id = $1`,
    [parceriaId, motivo ?? null],
  );
  await sendEmail({
    to: p.comprador_email,
    ...emailParceriaRecusada(p.comprador_nome, resumoImovel(p), motivo ?? null, `${env.APP_WEB_URL}/vitrine`),
  });
  await sendWhatsapp({
    to: p.comprador_whatsapp,
    message: `Imob Parcerias: sua solicitação de parceria (${resumoImovel(p)}) não foi aceita.${motivo ? ` Motivo: ${motivo}` : ''}`,
  });
  return { id: parceriaId, status: 'recusada' as const };
}

/** Contrato de Parceria Digital (versão inicial). Acessível às duas partes. */
export async function obterContrato(parceriaId: string, corretorId: string) {
  const { rows } = await query<{
    status: string;
    cliente_nome: string;
    janela_dias: number;
    criado_em: string;
    captador_id: string;
    comprador_id: string;
    captador_nome: string;
    captador_creci: string | null;
    comprador_nome: string;
    comprador_creci: string | null;
    imovel_tipo: string;
    imovel_bairro: string;
    imovel_cidade: string;
    imovel_preco: string;
    visita_em: string | null;
    confirmada_em: string | null;
    janela_ativada_em: string | null;
  }>(
    `SELECT p.status, p.cliente_nome, p.janela_dias, p.criado_em,
            p.captador_id, p.comprador_id,
            p.visita_em, p.confirmada_em, p.janela_ativada_em,
            cap.nome AS captador_nome, cap.creci AS captador_creci,
            comp.nome AS comprador_nome, comp.creci AS comprador_creci,
            i.tipo AS imovel_tipo, i.bairro AS imovel_bairro, i.cidade AS imovel_cidade,
            i.preco::text AS imovel_preco
     FROM parceria p
     JOIN imovel i ON i.id = p.imovel_id
     JOIN corretor cap ON cap.id = p.captador_id
     JOIN corretor comp ON comp.id = p.comprador_id
     WHERE p.id = $1`,
    [parceriaId],
  );
  const p = rows[0];
  if (!p) throw notFound('Parceria não encontrada.');
  if (p.captador_id !== corretorId && p.comprador_id !== corretorId) {
    throw forbidden('Acesso negado.');
  }
  const texto = gerarContratoParceria({
    captadorNome: p.captador_nome,
    captadorCreci: p.captador_creci,
    compradorNome: p.comprador_nome,
    compradorCreci: p.comprador_creci,
    clienteNome: p.cliente_nome,
    imovelTipo: p.imovel_tipo,
    imovelBairro: p.imovel_bairro,
    imovelCidade: p.imovel_cidade,
    imovelPreco: Number(p.imovel_preco),
    janelaDias: p.janela_dias,
    status: p.status,
    criadoEm: p.criado_em,
    visitaEm: p.visita_em,
    confirmadaEm: p.confirmada_em,
    janelaAtivadaEm: p.janela_ativada_em,
  });
  return { versao: TERMO_PARCERIA_VERSAO, texto };
}

// ============================================================
// Fase 7 — Chat interno e confirmação bilateral da visita
// ============================================================

interface ParceriaFull {
  id: string;
  status: string;
  cliente_nome: string;
  criado_em: string;
  captador_id: string;
  comprador_id: string;
  visita_em: string | null;
  cpf_cliente: string | null;
  confirmada_em: string | null;
  janela_ativada_em: string | null;
  janela_dias: number;
  venda_valor: string | null;
  comissao: string | null;
  taxa_plataforma: string | null;
  venda_declarada_em: string | null;
  pagamento_status: string;
  pagamento_vencimento: string | null;
  pagamento_confirmado_em: string | null;
  captador_nome: string;
  captador_whatsapp: string | null;
  captador_email: string;
  comprador_nome: string;
  comprador_whatsapp: string | null;
  comprador_email: string;
  imovel_id: string;
  imovel_tipo: string;
  imovel_bairro: string;
  imovel_cidade: string;
  imovel_preco: string;
  imovel_cep: string;
  imovel_logradouro: string;
  imovel_numero: string;
  imovel_complemento: string | null;
  imovel_unidade: string | null;
  imovel_andar: string | null;
  imovel_bloco: string | null;
}

async function buscarParceriaFull(parceriaId: string): Promise<ParceriaFull> {
  const { rows } = await query<ParceriaFull>(
    `SELECT p.id, p.status, p.cliente_nome, p.criado_em, p.captador_id, p.comprador_id,
            p.visita_em, p.cpf_cliente, p.confirmada_em, p.janela_ativada_em, p.janela_dias,
            p.venda_valor::text AS venda_valor, p.comissao::text AS comissao,
            p.taxa_plataforma::text AS taxa_plataforma, p.venda_declarada_em,
            p.pagamento_status, p.pagamento_vencimento::text AS pagamento_vencimento,
            p.pagamento_confirmado_em,
            cap.nome AS captador_nome, cap.whatsapp AS captador_whatsapp, cap.email AS captador_email,
            comp.nome AS comprador_nome, comp.whatsapp AS comprador_whatsapp, comp.email AS comprador_email,
            i.id AS imovel_id, i.tipo AS imovel_tipo, i.bairro AS imovel_bairro,
            i.cidade AS imovel_cidade, i.preco::text AS imovel_preco, i.cep AS imovel_cep,
            i.logradouro AS imovel_logradouro, i.numero AS imovel_numero,
            i.complemento AS imovel_complemento, i.unidade AS imovel_unidade,
            i.andar AS imovel_andar, i.bloco AS imovel_bloco
     FROM parceria p
     JOIN imovel i ON i.id = p.imovel_id
     JOIN corretor cap ON cap.id = p.captador_id
     JOIN corretor comp ON comp.id = p.comprador_id
     WHERE p.id = $1`,
    [parceriaId],
  );
  if (!rows[0]) throw notFound('Parceria não encontrada.');
  return rows[0];
}

/** Detalhe da parceria com dados liberados conforme o nível de acesso (2.1 do escopo). */
export async function obterParceria(parceriaId: string, corretorId: string) {
  const p = await buscarParceriaFull(parceriaId);
  if (p.captador_id !== corretorId && p.comprador_id !== corretorId) {
    throw forbidden('Acesso negado.');
  }
  const souCaptador = p.captador_id === corretorId;
  const papel = souCaptador ? 'captador' : 'comprador';

  // Nível 2 (após match aceito): endereço completo e condições.
  const nivel2 = ['aceita', 'em_negociacao', 'encerrada'].includes(p.status);
  // Nível 3 (após confirmação bilateral): contatos revelados.
  const nivel3 = ['em_negociacao', 'encerrada'].includes(p.status) && Boolean(p.confirmada_em);

  return {
    id: p.id,
    status: p.status,
    papel,
    cliente_nome: p.cliente_nome,
    criado_em: p.criado_em,
    imovel: {
      id: p.imovel_id,
      tipo: p.imovel_tipo,
      bairro: p.imovel_bairro,
      cidade: p.imovel_cidade,
      preco: Number(p.imovel_preco),
      endereco: nivel2
        ? {
            cep: p.imovel_cep,
            logradouro: p.imovel_logradouro,
            numero: p.imovel_numero,
            complemento: p.imovel_complemento,
            unidade: p.imovel_unidade,
            andar: p.imovel_andar,
            bloco: p.imovel_bloco,
          }
        : null,
    },
    confirmacao: {
      visita_em: p.visita_em,
      // O CPF só é revelado ao captador após a confirmação bilateral (Nível 3).
      cpf_preenchido: Boolean(p.cpf_cliente),
      cpf_cliente: souCaptador ? (nivel3 ? p.cpf_cliente : null) : p.cpf_cliente,
      confirmada_em: p.confirmada_em,
      janela_ativada_em: p.janela_ativada_em,
      janela_dias: p.janela_dias,
    },
    contatos: nivel3
      ? {
          captador: { nome: p.captador_nome, whatsapp: p.captador_whatsapp },
          comprador: { nome: p.comprador_nome, whatsapp: p.comprador_whatsapp },
        }
      : null,
    venda: p.venda_declarada_em
      ? {
          valor: Number(p.venda_valor),
          comissao: Number(p.comissao),
          taxa_plataforma: Number(p.taxa_plataforma),
          declarada_em: p.venda_declarada_em,
          pagamento_status: p.pagamento_status,
          pagamento_vencimento: p.pagamento_vencimento,
          pagamento_confirmado_em: p.pagamento_confirmado_em,
        }
      : null,
    avaliacao: await resumoAvaliacao(p.id, corretorId),
  };
}

async function resumoAvaliacao(parceriaId: string, corretorId: string) {
  const { rows } = await query<{ autor_id: string }>(
    'SELECT autor_id FROM avaliacao WHERE parceria_id = $1',
    [parceriaId],
  );
  return {
    ja_avaliei: rows.some((r) => r.autor_id === corretorId),
    total: rows.length,
  };
}

interface MensagemRow {
  id: string;
  autor_id: string;
  corpo: string;
  criado_em: string;
}

export async function listarMensagens(parceriaId: string, corretorId: string) {
  const p = await buscarParceriaFull(parceriaId);
  if (p.captador_id !== corretorId && p.comprador_id !== corretorId) {
    throw forbidden('Acesso negado.');
  }
  const { rows } = await query<MensagemRow>(
    `SELECT id, autor_id, corpo, criado_em FROM parceria_mensagem
     WHERE parceria_id = $1 ORDER BY criado_em ASC`,
    [parceriaId],
  );
  return { data: rows.map((m) => ({ ...m, meu: m.autor_id === corretorId })) };
}

export async function enviarMensagem(parceriaId: string, corretorId: string, corpo: string) {
  const p = await buscarParceriaFull(parceriaId);
  if (p.captador_id !== corretorId && p.comprador_id !== corretorId) {
    throw forbidden('Acesso negado.');
  }
  if (p.status !== 'aceita') {
    throw conflict('O chat está disponível apenas enquanto a parceria está aceita.');
  }
  const { rows } = await query<MensagemRow>(
    `INSERT INTO parceria_mensagem (parceria_id, autor_id, corpo)
     VALUES ($1, $2, $3)
     RETURNING id, autor_id, corpo, criado_em`,
    [parceriaId, corretorId, corpo],
  );
  return { ...rows[0], meu: true };
}

/**
 * Fecha a confirmação bilateral quando visita (captador) e CPF (comprador) estão
 * ambos preenchidos: ativa a janela de 180 dias, muda o status para EM NEGOCIAÇÃO
 * e coloca o imóvel em negociação. Roda dentro da transação de quem completa o par.
 */
async function finalizarSeBilateral(
  client: import('pg').PoolClient,
  parceriaId: string,
  imovelId: string,
): Promise<'em_negociacao' | 'aceita'> {
  const { rows } = await client.query<{ visita_em: string | null; cpf_cliente: string | null }>(
    'SELECT visita_em, cpf_cliente FROM parceria WHERE id = $1 FOR UPDATE',
    [parceriaId],
  );
  const p = rows[0];
  if (p && p.visita_em && p.cpf_cliente) {
    await client.query(
      `UPDATE parceria
       SET status = 'em_negociacao', confirmada_em = now(), janela_ativada_em = now(),
           atualizado_em = now()
       WHERE id = $1`,
      [parceriaId],
    );
    await client.query(
      `UPDATE imovel SET status = 'em_negociacao', atualizado_em = now() WHERE id = $1`,
      [imovelId],
    );
    // Fila de espera: registra os compradores com solicitação pendente no momento em que
    // o imóvel sai da vitrine (serão avisados se ele voltar a DISPONÍVEL — Fase 9).
    await client.query(
      `INSERT INTO fila_espera (imovel_id, comprador_id)
       SELECT imovel_id, comprador_id FROM parceria
       WHERE imovel_id = $1 AND status = 'solicitada' AND id <> $2
       ON CONFLICT (imovel_id, comprador_id) DO NOTHING`,
      [imovelId, parceriaId],
    );
    return 'em_negociacao';
  }
  return 'aceita';
}

/** Captador registra a data da visita (campo exclusivo do captador — Nota 16). */
export async function registrarVisita(parceriaId: string, captadorId: string, visitaEm: string) {
  const p = await buscarParceriaFull(parceriaId);
  if (p.captador_id !== captadorId) {
    throw forbidden('Apenas o corretor captador registra a data da visita.');
  }
  if (p.status !== 'aceita') {
    throw conflict('A parceria precisa estar aceita para registrar a visita.');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE parceria SET visita_em = $2, atualizado_em = now() WHERE id = $1`,
      [parceriaId, visitaEm],
    );
    const status = await finalizarSeBilateral(client, parceriaId, p.imovel_id);
    await client.query('COMMIT');
    return { id: parceriaId, status };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Comprador insere o CPF do cliente (campo exclusivo do comprador — Nota 16). */
export async function inserirCpf(parceriaId: string, compradorId: string, cpf: string) {
  const p = await buscarParceriaFull(parceriaId);
  if (p.comprador_id !== compradorId) {
    throw forbidden('Apenas o corretor comprador insere o CPF do cliente.');
  }
  if (p.status !== 'aceita') {
    throw conflict('A parceria precisa estar aceita para inserir o CPF.');
  }
  if (cpf.length !== 11) {
    throw badRequest('CPF inválido.');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE parceria SET cpf_cliente = $2, atualizado_em = now() WHERE id = $1`,
      [parceriaId, cpf],
    );
    const status = await finalizarSeBilateral(client, parceriaId, p.imovel_id);
    await client.query('COMMIT');
    return { id: parceriaId, status };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// Fases 8 e 9 — fechamento da venda, cobrança e avaliação
// ============================================================

const PRAZO_PAGAMENTO_DIAS = 15;
/** Fase 8 — o captador declara a venda; calcula comissão (5%) e taxa (10% da comissão). */
export async function declararVenda(parceriaId: string, captadorId: string, valor: number) {
  const p = await buscarParceriaFull(parceriaId);
  if (p.captador_id !== captadorId) {
    throw forbidden('Apenas o corretor captador declara a venda.');
  }
  if (p.status !== 'em_negociacao') {
    throw conflict('A venda só pode ser declarada com a parceria em negociação.');
  }
  const { comissao, taxa } = calcularComissaoTaxa(valor);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE parceria
       SET status = 'vendida', venda_valor = $2, comissao = $3, taxa_plataforma = $4,
           venda_declarada_em = now(), pagamento_status = 'pendente',
           pagamento_vencimento = (now() + ($5 || ' days')::interval)::date,
           atualizado_em = now()
       WHERE id = $1`,
      [parceriaId, valor, comissao, taxa, String(PRAZO_PAGAMENTO_DIAS)],
    );
    await client.query(
      `UPDATE imovel SET status = 'vendido', atualizado_em = now() WHERE id = $1`,
      [p.imovel_id],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  await sendEmail({
    to: p.comprador_email,
    ...emailVendaDeclarada(
      p.comprador_nome,
      resumoImovel(p),
      valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      `${env.APP_WEB_URL}/parcerias/${parceriaId}`,
    ),
  });
  await sendWhatsapp({
    to: p.comprador_whatsapp,
    message: `Imob Parcerias: venda declarada na parceria (${resumoImovel(p)}). Acompanhe: ${env.APP_WEB_URL}/parcerias/${parceriaId}`,
  });
  return { id: parceriaId, status: 'vendida' as const, valor, comissao, taxa_plataforma: taxa };
}

/** Fase 9 — encerra a negociação sem venda; imóvel volta a DISPONÍVEL e a fila é avisada. */
export async function encerrarSemVenda(parceriaId: string, corretorId: string) {
  const p = await buscarParceriaFull(parceriaId);
  if (p.captador_id !== corretorId && p.comprador_id !== corretorId) {
    throw forbidden('Acesso negado.');
  }
  if (!['aceita', 'em_negociacao'].includes(p.status)) {
    throw conflict('Esta parceria não pode ser encerrada.');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE parceria SET status = 'encerrada', atualizado_em = now() WHERE id = $1`,
      [parceriaId],
    );
    // Imóvel volta a DISPONÍVEL (a janela de 180 dias do contrato permanece ativa).
    await client.query(
      `UPDATE imovel SET status = 'ativo', atualizado_em = now() WHERE id = $1`,
      [p.imovel_id],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    if (err && typeof err === 'object' && (err as { code?: string }).code === '23505') {
      throw conflict('Já existe outro imóvel ativo com o mesmo endereço.');
    }
    throw err;
  } finally {
    client.release();
  }
  await notificarFilaEspera(p.imovel_id, parceriaId, p.imovel_tipo, p.imovel_bairro, p.imovel_cidade);
  return { id: parceriaId, status: 'encerrada' as const };
}

/** Avisa (e-mail) os compradores com solicitação pendente no mesmo imóvel (fila de espera). */
async function notificarFilaEspera(
  imovelId: string,
  parceriaAtual: string,
  tipo: string,
  bairro: string,
  cidade: string,
): Promise<void> {
  // Compradores na fila de espera + solicitações ainda pendentes (união, sem duplicar).
  const { rows } = await query<{ nome: string; email: string }>(
    `SELECT DISTINCT c.nome, c.email FROM corretor c
     WHERE c.id IN (
       SELECT comprador_id FROM fila_espera WHERE imovel_id = $1
       UNION
       SELECT comprador_id FROM parceria
         WHERE imovel_id = $1 AND id <> $2 AND status = 'solicitada'
     )`,
    [imovelId, parceriaAtual],
  );
  for (const dest of rows) {
    await sendEmail({
      to: dest.email,
      ...emailImovelDisponivel(dest.nome, tipo, bairro, cidade, `${env.APP_WEB_URL}/vitrine/${imovelId}`),
    });
  }
  await query('DELETE FROM fila_espera WHERE imovel_id = $1', [imovelId]);
}

/** Confirmação manual do pagamento (equipe) — libera a avaliação mútua. */
export async function confirmarPagamento(parceriaId: string) {
  const { rows } = await query<{ pagamento_status: string }>(
    'SELECT pagamento_status FROM parceria WHERE id = $1',
    [parceriaId],
  );
  const p = rows[0];
  if (!p) throw notFound('Parceria não encontrada.');
  if (p.pagamento_status !== 'pendente') {
    throw conflict('Não há pagamento pendente para confirmar.');
  }
  await query(
    `UPDATE parceria
     SET pagamento_status = 'confirmado', pagamento_confirmado_em = now(), atualizado_em = now()
     WHERE id = $1`,
    [parceriaId],
  );
  const full = await buscarParceriaFull(parceriaId);
  const url = `${env.APP_WEB_URL}/parcerias/${parceriaId}`;
  const resumo = resumoImovel(full);
  await sendEmail({ to: full.captador_email, ...emailPagamentoConfirmado(full.captador_nome, resumo, url) });
  await sendEmail({ to: full.comprador_email, ...emailPagamentoConfirmado(full.comprador_nome, resumo, url) });
  await sendWhatsapp({ to: full.captador_whatsapp, message: `Imob Parcerias: pagamento confirmado (${resumo}). Avalie a parceria: ${url}` });
  await sendWhatsapp({ to: full.comprador_whatsapp, message: `Imob Parcerias: pagamento confirmado (${resumo}). Avalie a parceria: ${url}` });
  return { id: parceriaId, pagamento_status: 'confirmado' as const };
}

/** Pagamentos pendentes (visão da equipe). */
export async function listarPagamentosPendentes() {
  const { rows } = await query<ParceriaRow & { venda_valor: string; taxa_plataforma: string; pagamento_vencimento: string }>(
    `SELECT ${RESUMO_SELECT}, p.venda_valor::text AS venda_valor,
            p.taxa_plataforma::text AS taxa_plataforma,
            p.pagamento_vencimento::text AS pagamento_vencimento
     ${RESUMO_JOINS}
     WHERE p.pagamento_status = 'pendente'
     ORDER BY p.pagamento_vencimento ASC`,
  );
  return {
    data: rows.map((r) => ({
      ...mapResumo(r),
      venda_valor: Number(r.venda_valor),
      taxa_plataforma: Number(r.taxa_plataforma),
      pagamento_vencimento: r.pagamento_vencimento,
    })),
  };
}

/** Fase 8 — avaliação mútua (1 a 5 estrelas), após o pagamento confirmado. */
export async function avaliar(
  parceriaId: string,
  autorId: string,
  nota: number,
  comentario?: string,
) {
  const p = await buscarParceriaFull(parceriaId);
  if (p.captador_id !== autorId && p.comprador_id !== autorId) {
    throw forbidden('Acesso negado.');
  }
  if (p.pagamento_status !== 'confirmado') {
    throw conflict('A avaliação é liberada após a confirmação do pagamento.');
  }
  const alvoId = p.captador_id === autorId ? p.comprador_id : p.captador_id;
  try {
    await query(
      `INSERT INTO avaliacao (parceria_id, autor_id, alvo_id, nota, comentario)
       VALUES ($1, $2, $3, $4, $5)`,
      [parceriaId, autorId, alvoId, nota, comentario ?? null],
    );
  } catch (err) {
    if (err && typeof err === 'object' && (err as { code?: string }).code === '23505') {
      throw conflict('Você já avaliou esta parceria.');
    }
    throw err;
  }
  return { id: parceriaId, avaliado: true };
}

/** Job de inadimplência: suspende captadores com pagamento vencido (Fase 8 / 1.4). */
export async function suspenderInadimplentes(): Promise<number> {
  const { rows } = await query<{ captador_id: string }>(
    `SELECT DISTINCT captador_id FROM parceria
     WHERE pagamento_status = 'pendente' AND pagamento_vencimento < current_date`,
  );
  if (rows.length === 0) return 0;
  const ids = rows.map((r) => r.captador_id);
  const { rowCount } = await query(
    `UPDATE corretor SET status = 'suspenso', atualizado_em = now()
     WHERE id = ANY($1::uuid[]) AND status = 'ativo'`,
    [ids],
  );
  return rowCount ?? 0;
}
