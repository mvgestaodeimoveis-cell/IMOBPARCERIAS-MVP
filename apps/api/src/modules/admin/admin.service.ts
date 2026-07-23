import { pool, query } from '../../db/pool';
import { env } from '../../config/env';
import { conflict, notFound } from '../../lib/errors';
import { hashPassword } from '../../lib/password';
import { sendEmail } from '../../lib/email';
import { emailCreciAprovado, emailCreciRejeitado } from '../../lib/email-templates';
import type { CriarAdminInput, ListCorretoresQuery, ListImoveisQuery } from './admin.schemas';

interface CorretorListRow {
  id: string;
  nome: string;
  creci: string;
  cidade: string;
  status: string;
  criado_em: string;
  ultimo_acesso_em: string | null;
  imoveis_total: number;
}

export async function listCorretores(q: ListCorretoresQuery) {
  // Corretores arquivados (soft delete) ficam ocultos da lista.
  const conditions: string[] = ['excluido_em IS NULL'];
  const params: unknown[] = [];

  if (q.status) {
    params.push(q.status);
    conditions.push(`status = $${params.length}`);
  }
  if (q.busca) {
    params.push(`%${q.busca}%`);
    conditions.push(`(nome ILIKE $${params.length} OR email ILIKE $${params.length} OR creci ILIKE $${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalRes = await query<{ count: string }>(
    `SELECT count(*)::text AS count FROM corretor ${where}`,
    params,
  );
  const total = Number(totalRes.rows[0]?.count ?? 0);

  const offset = (q.page - 1) * q.page_size;
  const ORDER_BY: Record<string, string> = {
    recentes: 'criado_em DESC',
    antigos: 'criado_em ASC',
    ultimo_acesso: 'ultimo_acesso_em DESC NULLS LAST',
    mais_imoveis: 'imoveis_total DESC, criado_em ASC',
    nome: 'nome ASC',
  };
  const orderBy = ORDER_BY[q.ordem] ?? ORDER_BY.antigos;
  const dataRes = await query<CorretorListRow>(
    `SELECT id, nome, creci, cidade, status, criado_em, ultimo_acesso_em,
            (SELECT count(*)::int FROM imovel i WHERE i.corretor_id = corretor.id AND i.status <> 'inativo') AS imoveis_total
     FROM corretor ${where}
     ORDER BY ${orderBy}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, q.page_size, offset],
  );

  return { data: dataRes.rows, page: q.page, page_size: q.page_size, total };
}

/** Suspende um corretor (ativo/pendente → suspenso). */
export async function suspenderCorretor(id: string) {
  const { rowCount } = await query(
    `UPDATE corretor SET status = 'suspenso', atualizado_em = now()
     WHERE id = $1 AND status IN ('ativo', 'verificacao_pendente')`,
    [id],
  );
  if (!rowCount) throw conflict('Não é possível suspender este corretor no status atual.');
  return { id, status: 'suspenso' as const };
}

/** Reativa um corretor suspenso → ativo. */
export async function reativarCorretor(id: string) {
  const { rowCount } = await query(
    `UPDATE corretor SET status = 'ativo', atualizado_em = now()
     WHERE id = $1 AND status = 'suspenso'`,
    [id],
  );
  if (!rowCount) throw conflict('Só é possível reativar um corretor suspenso.');
  return { id, status: 'ativo' as const };
}

/** Exclusão lógica (soft delete): arquiva o corretor E os imóveis dele (saem da vitrine).
 * Libera e-mail/CRECI (únicos) e a exclusividade dos imóveis para não bloquear um futuro
 * novo cadastro do mesmo corretor ou do mesmo imóvel (decisão do cliente, jul/2026). */
export async function excluirCorretor(id: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // "Solta" e-mail e CRECI renomeando na linha arquivada (o id garante unicidade),
    // liberando os valores originais para um novo cadastro no futuro.
    const { rowCount } = await client.query(
      `UPDATE corretor
       SET excluido_em = now(), atualizado_em = now(),
           email = 'excluido:' || id || ':' || email,
           creci = 'excluido:' || id || ':' || creci
       WHERE id = $1 AND excluido_em IS NULL`,
      [id],
    );
    if (!rowCount) throw notFound('Corretor não encontrado.');
    // Arquiva os imóveis do corretor: saem da vitrine, liberam a chave de dedupe e a
    // exclusividade (para não bloquear um futuro cadastro do mesmo imóvel por outro corretor).
    await client.query(
      `UPDATE imovel
       SET status = 'inativo', atualizado_em = now(),
           exclusividade_status = 'nao', exclusividade_vencimento = NULL
       WHERE corretor_id = $1`,
      [id],
    );
    await client.query('COMMIT');
    return { id, excluido: true as const };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

interface AceiteTermoRow {
  id: string;
  imovel_id: string | null;
  versao: string;
  documento_hash: string;
  ip: string;
  user_agent: string;
  creci: string | null;
  aceito_em: string;
  imovel_tipo: string | null;
  imovel_bairro: string | null;
  imovel_cidade: string | null;
  imovel_preco: string | null;
  imovel_status: string | null;
}

/**
 * Aceites do Termo de Parceria de um corretor — prova jurídica por imóvel:
 * data/hora, IP, CRECI, versão e hash do documento aceito.
 */
export async function listarAceitesTermo(corretorId: string) {
  const corretorRes = await query<{ id: string; nome: string; email: string; creci: string }>(
    'SELECT id, nome, email, creci FROM corretor WHERE id = $1',
    [corretorId],
  );
  if (!corretorRes.rows[0]) throw notFound('Corretor não encontrado.');

  const { rows } = await query<AceiteTermoRow>(
    `SELECT a.id, a.imovel_id, a.versao, a.documento_hash, host(a.ip) AS ip,
            a.user_agent, a.creci, a.aceito_em,
            i.tipo AS imovel_tipo, i.bairro AS imovel_bairro, i.cidade AS imovel_cidade,
            i.preco::text AS imovel_preco, i.status AS imovel_status
     FROM termo_parceria_aceite a
     LEFT JOIN imovel i ON i.id = a.imovel_id
     WHERE a.corretor_id = $1
     ORDER BY a.aceito_em DESC`,
    [corretorId],
  );

  return { corretor: corretorRes.rows[0], data: rows };
}

// ============================================================
// Moderação de imóveis (equipe)
// ============================================================

interface ImovelModRow {
  id: string;
  tipo: string;
  finalidade: string;
  preco: string;
  cidade: string;
  bairro: string;
  status: string;
  exclusividade_status: string;
  criado_em: string;
  corretor_nome: string;
  corretor_creci: string | null;
}

export async function listImoveis(q: ListImoveisQuery) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    return sql.replace('$?', `$${params.length}`);
  };

  if (q.status) conditions.push(add('i.status = $?', q.status));
  if (q.cidade) conditions.push(add('i.cidade ILIKE $?', `%${q.cidade}%`));
  if (q.busca) {
    params.push(`%${q.busca}%`);
    conditions.push(`(i.bairro ILIKE $${params.length} OR c.nome ILIKE $${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalRes = await query<{ count: string }>(
    `SELECT count(*)::text AS count FROM imovel i JOIN corretor c ON c.id = i.corretor_id ${where}`,
    params,
  );
  const total = Number(totalRes.rows[0]?.count ?? 0);

  const offset = (q.page - 1) * q.page_size;
  const dataRes = await query<ImovelModRow>(
    `SELECT i.id, i.tipo, i.finalidade, i.preco::text AS preco, i.cidade, i.bairro,
            i.status, i.exclusividade_status, i.criado_em,
            c.nome AS corretor_nome, c.creci AS corretor_creci
     FROM imovel i JOIN corretor c ON c.id = i.corretor_id
     ${where}
     ORDER BY i.criado_em DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, q.page_size, offset],
  );

  return {
    data: dataRes.rows.map((r) => ({ ...r, preco: Number(r.preco) })),
    page: q.page,
    page_size: q.page_size,
    total,
  };
}

export async function desabilitarImovel(id: string) {
  const { rowCount } = await query(
    `UPDATE imovel SET status = 'inativo', atualizado_em = now()
     WHERE id = $1 AND status <> 'inativo'`,
    [id],
  );
  if (!rowCount) throw conflict('Imóvel não encontrado ou já inativo.');
  return { id, status: 'inativo' as const };
}

export async function reativarImovel(id: string) {
  try {
    const { rowCount } = await query(
      `UPDATE imovel SET status = 'ativo', atualizado_em = now()
       WHERE id = $1 AND status = 'inativo'`,
      [id],
    );
    if (!rowCount) throw conflict('Só é possível reativar um imóvel inativo.');
  } catch (err) {
    if (err && typeof err === 'object' && (err as { code?: string }).code === '23505') {
      throw conflict('Já existe outro imóvel ativo com o mesmo endereço.');
    }
    throw err;
  }
  return { id, status: 'ativo' as const };
}

export async function excluirImovel(id: string) {
  const { rowCount } = await query('DELETE FROM imovel WHERE id = $1', [id]);
  if (!rowCount) throw notFound('Imóvel não encontrado.');
  return { id, excluido: true as const };
}

// ============================================================
// Monitoramento de conversas (chat) — a plataforma acompanha as
// interações entre parceiros para poder intervir (ex.: tentativa de
// levar a negociação para fora da plataforma).
// ============================================================

// Sinais de possível contato externo / negociação por fora da plataforma.
const PADRAO_CONTATO_EXTERNO =
  /\b(whats?app|whats|zap+|telefone|celular|ligar|me\s+chama|fora\s+da\s+plataforma|por\s+fora|meu\s+n[uú]mero|meu\s+numero|e-?mail|gmail|hotmail|outlook)\b|(\+?\d[\s.-]?){10,}|@[\w.-]+\.\w{2,}/i;

// Versão para o Postgres (POSIX) — usada só para CONTAR alertas por conversa em SQL.
const PADRAO_CONTATO_EXTERNO_PG =
  '(whats|zap|telefone|celular|ligar|me chama|por fora|fora da plataforma|meu numero|meu número|e-?mail|gmail|hotmail|outlook|[0-9][0-9 .-]{8,})';

export function detectarContatoExterno(texto: string): boolean {
  return PADRAO_CONTATO_EXTERNO.test(texto);
}

interface ConversaAdminRow {
  id: string;
  status: string;
  imovel_id: string;
  imovel_tipo: string;
  imovel_bairro: string;
  imovel_cidade: string;
  captador_nome: string;
  comprador_nome: string;
  total_mensagens: string;
  alertas: string;
  ultima_msg: string | null;
  ultima_msg_em: string | null;
}

/** Todas as conversas com ao menos uma mensagem (visão da equipe). */
export async function listarConversasAdmin() {
  const { rows } = await query<ConversaAdminRow>(
    `SELECT p.id, p.status, p.imovel_id,
       i.tipo AS imovel_tipo, i.bairro AS imovel_bairro, i.cidade AS imovel_cidade,
       cap.nome AS captador_nome, comp.nome AS comprador_nome,
       (SELECT count(*) FROM parceria_mensagem m WHERE m.parceria_id = p.id)::text AS total_mensagens,
       (SELECT count(*) FROM parceria_mensagem m WHERE m.parceria_id = p.id AND m.corpo ~* $1)::text AS alertas,
       lm.corpo AS ultima_msg, lm.criado_em::text AS ultima_msg_em
     FROM parceria p
     JOIN imovel i ON i.id = p.imovel_id
     JOIN corretor cap ON cap.id = p.captador_id
     JOIN corretor comp ON comp.id = p.comprador_id
     LEFT JOIN LATERAL (
       SELECT corpo, criado_em FROM parceria_mensagem
       WHERE parceria_id = p.id ORDER BY criado_em DESC LIMIT 1
     ) lm ON true
     WHERE EXISTS (SELECT 1 FROM parceria_mensagem m WHERE m.parceria_id = p.id)
     ORDER BY COALESCE(lm.criado_em, p.criado_em) DESC`,
    [PADRAO_CONTATO_EXTERNO_PG],
  );
  return {
    data: rows.map((r) => ({
      id: r.id,
      status: r.status,
      imovel: {
        id: r.imovel_id,
        tipo: r.imovel_tipo,
        bairro: r.imovel_bairro,
        cidade: r.imovel_cidade,
      },
      captador_nome: r.captador_nome,
      comprador_nome: r.comprador_nome,
      total_mensagens: Number(r.total_mensagens),
      alertas: Number(r.alertas),
      ultima_mensagem: r.ultima_msg
        ? { corpo: r.ultima_msg, criado_em: r.ultima_msg_em }
        : null,
    })),
  };
}

interface MensagemAdminRow {
  id: string;
  autor_id: string;
  autor_nome: string;
  corpo: string;
  criado_em: string;
}

/** Cabeçalho + todas as mensagens de uma conversa (visão da equipe). */
export async function obterConversaAdmin(parceriaId: string) {
  const cab = await query<{
    id: string;
    status: string;
    imovel_id: string;
    imovel_tipo: string;
    imovel_bairro: string;
    imovel_cidade: string;
    captador_id: string;
    captador_nome: string;
    comprador_id: string;
    comprador_nome: string;
  }>(
    `SELECT p.id, p.status, p.imovel_id,
       i.tipo AS imovel_tipo, i.bairro AS imovel_bairro, i.cidade AS imovel_cidade,
       p.captador_id, cap.nome AS captador_nome,
       p.comprador_id, comp.nome AS comprador_nome
     FROM parceria p
     JOIN imovel i ON i.id = p.imovel_id
     JOIN corretor cap ON cap.id = p.captador_id
     JOIN corretor comp ON comp.id = p.comprador_id
     WHERE p.id = $1`,
    [parceriaId],
  );
  if (!cab.rows[0]) throw notFound('Conversa não encontrada.');

  const { rows } = await query<MensagemAdminRow>(
    `SELECT m.id, m.autor_id, a.nome AS autor_nome, m.corpo, m.criado_em::text AS criado_em
     FROM parceria_mensagem m
     JOIN corretor a ON a.id = m.autor_id
     WHERE m.parceria_id = $1
     ORDER BY m.criado_em ASC`,
    [parceriaId],
  );

  const feedbacks = await query<{ autor_id: string; autor_nome: string; resultado: string; observacao: string | null; criado_em: string }>(
    `SELECT f.autor_id, a.nome AS autor_nome, f.resultado, f.observacao, f.criado_em::text AS criado_em
     FROM parceria_visita_feedback f
     JOIN corretor a ON a.id = f.autor_id
     WHERE f.parceria_id = $1
     ORDER BY f.criado_em DESC`,
    [parceriaId],
  );

  return {
    parceria: cab.rows[0],
    mensagens: rows.map((m) => ({ ...m, alerta: detectarContatoExterno(m.corpo) })),
    feedbacks: feedbacks.rows,
  };
}

// ============================================================
// Denúncias / relatos de problema no chat (jul/2026)
// ============================================================

interface DenunciaAdminRow {
  id: string;
  parceria_id: string;
  categoria: string;
  descricao: string;
  status: string;
  resolucao_nota: string | null;
  resolvido_em: string | null;
  criado_em: string;
  autor_id: string;
  autor_nome: string;
  imovel_id: string;
  imovel_tipo: string;
  imovel_bairro: string;
  imovel_cidade: string;
  captador_nome: string;
  captador_email: string;
  captador_whatsapp: string | null;
  comprador_nome: string;
  comprador_email: string;
  comprador_whatsapp: string | null;
}

function mapDenuncia(r: DenunciaAdminRow) {
  return {
    id: r.id,
    parceria_id: r.parceria_id,
    categoria: r.categoria,
    descricao: r.descricao,
    status: r.status,
    resolucao_nota: r.resolucao_nota,
    resolvido_em: r.resolvido_em,
    criado_em: r.criado_em,
    autor_nome: r.autor_nome,
    imovel: { id: r.imovel_id, tipo: r.imovel_tipo, bairro: r.imovel_bairro, cidade: r.imovel_cidade },
    captador: { nome: r.captador_nome, email: r.captador_email, whatsapp: r.captador_whatsapp },
    comprador: { nome: r.comprador_nome, email: r.comprador_email, whatsapp: r.comprador_whatsapp },
  };
}

/** Lista as denúncias (filtro opcional por status). Inclui contatos das duas partes. */
export async function listarDenuncias(status?: string) {
  const params: unknown[] = [];
  let where = '';
  if (status) {
    params.push(status);
    where = `WHERE d.status = $${params.length}`;
  }
  const { rows } = await query<DenunciaAdminRow>(
    `SELECT d.id, d.parceria_id, d.categoria, d.descricao, d.status,
            d.resolucao_nota, d.resolvido_em::text AS resolvido_em, d.criado_em::text AS criado_em,
            d.autor_id, a.nome AS autor_nome,
            i.id AS imovel_id, i.tipo AS imovel_tipo, i.bairro AS imovel_bairro, i.cidade AS imovel_cidade,
            cap.nome AS captador_nome, cap.email AS captador_email, cap.whatsapp AS captador_whatsapp,
            comp.nome AS comprador_nome, comp.email AS comprador_email, comp.whatsapp AS comprador_whatsapp
     FROM parceria_denuncia d
     JOIN corretor a ON a.id = d.autor_id
     JOIN parceria p ON p.id = d.parceria_id
     JOIN imovel i ON i.id = p.imovel_id
     JOIN corretor cap ON cap.id = p.captador_id
     JOIN corretor comp ON comp.id = p.comprador_id
     ${where}
     ORDER BY (d.status = 'resolvida'), d.criado_em DESC`,
    params,
  );
  return {
    data: rows.map(mapDenuncia),
    pendentes: rows.filter((r) => r.status !== 'resolvida').length,
  };
}

/** Registra a resolução de uma denúncia (equipe): marca resolvida com uma nota. */
export async function resolverDenuncia(denunciaId: string, adminId: string, nota: string) {
  const { rowCount } = await query(
    `UPDATE parceria_denuncia
     SET status = 'resolvida', resolucao_nota = $2, resolvido_por = $3, resolvido_em = now()
     WHERE id = $1 AND status <> 'resolvida'`,
    [denunciaId, nota, adminId],
  );
  if (!rowCount) throw conflict('Denúncia não encontrada ou já resolvida.');
  return { id: denunciaId, status: 'resolvida' as const };
}

// ============================================================
// Acompanhamento das parcerias (equipe) — visão do "desenrolar"
// ============================================================

interface ParceriaAdminRow {
  id: string;
  status: string;
  cliente_nome: string;
  criado_em: string;
  atualizado_em: string;
  visita_em: string | null;
  visita_confirmada_em: string | null;
  confirmada_em: string | null;
  venda_declarada_em: string | null;
  venda_valor: string | null;
  pagamento_status: string;
  imovel_tipo: string;
  imovel_bairro: string;
  imovel_cidade: string;
  imovel_preco: string;
  captador_nome: string;
  comprador_nome: string;
  total_mensagens: string;
}

/** Lista todas as parcerias com o estágio atual (filtro opcional por status). */
export async function listarParceriasAdmin(status?: string) {
  const params: unknown[] = [];
  let where = '';
  if (status) {
    params.push(status);
    where = `WHERE p.status = $${params.length}`;
  }
  const { rows } = await query<ParceriaAdminRow>(
    `SELECT p.id, p.status, p.cliente_nome, p.criado_em::text AS criado_em,
            p.atualizado_em::text AS atualizado_em,
            p.visita_em::text AS visita_em, p.visita_confirmada_em::text AS visita_confirmada_em,
            p.confirmada_em::text AS confirmada_em, p.venda_declarada_em::text AS venda_declarada_em,
            p.venda_valor::text AS venda_valor, p.pagamento_status,
            i.tipo AS imovel_tipo, i.bairro AS imovel_bairro, i.cidade AS imovel_cidade,
            i.preco::text AS imovel_preco,
            cap.nome AS captador_nome, comp.nome AS comprador_nome,
            (SELECT count(*) FROM parceria_mensagem m WHERE m.parceria_id = p.id)::text AS total_mensagens
     FROM parceria p
     JOIN imovel i ON i.id = p.imovel_id
     JOIN corretor cap ON cap.id = p.captador_id
     JOIN corretor comp ON comp.id = p.comprador_id
     ${where}
     ORDER BY p.atualizado_em DESC`,
    params,
  );

  const resumo = await query<{ status: string; total: string }>(
    `SELECT status, count(*)::text AS total FROM parceria GROUP BY status`,
  );

  return {
    data: rows.map((r) => ({
      id: r.id,
      status: r.status,
      cliente_nome: r.cliente_nome,
      criado_em: r.criado_em,
      atualizado_em: r.atualizado_em,
      visita_em: r.visita_em,
      visita_confirmada_em: r.visita_confirmada_em,
      confirmada_em: r.confirmada_em,
      venda_declarada_em: r.venda_declarada_em,
      venda_valor: r.venda_valor ? Number(r.venda_valor) : null,
      pagamento_status: r.pagamento_status,
      total_mensagens: Number(r.total_mensagens),
      imovel: {
        tipo: r.imovel_tipo,
        bairro: r.imovel_bairro,
        cidade: r.imovel_cidade,
        preco: Number(r.imovel_preco),
      },
      captador_nome: r.captador_nome,
      comprador_nome: r.comprador_nome,
    })),
    resumo: Object.fromEntries(resumo.rows.map((r) => [r.status, Number(r.total)])),
  };
}


// ============================================================
// Histórico de importações por texto (colar do WhatsApp)
// ============================================================

interface ImportLogRow {
  id: string;
  texto: string;
  reconhecidos: string[];
  reconhecidos_count: number;
  origem: string;
  criado_em: string;
  corretor_nome: string | null;
}

/** Lista as importações por texto (opcionalmente só as que não reconheceram nada). */
export async function listarImportLogs(soFalhas?: boolean) {
  const where = soFalhas ? 'WHERE l.reconhecidos_count = 0' : '';
  const { rows } = await query<ImportLogRow>(
    `SELECT l.id, l.texto, l.reconhecidos, l.reconhecidos_count, l.origem,
            l.criado_em::text AS criado_em, c.nome AS corretor_nome
     FROM import_texto_log l
     LEFT JOIN corretor c ON c.id = l.corretor_id
     ${where}
     ORDER BY l.criado_em DESC
     LIMIT 200`,
  );
  const totais = await query<{ total: string; falhas: string }>(
    `SELECT count(*)::text AS total,
            count(*) FILTER (WHERE reconhecidos_count = 0)::text AS falhas
     FROM import_texto_log`,
  );
  return {
    data: rows,
    total: Number(totais.rows[0]?.total ?? 0),
    falhas: Number(totais.rows[0]?.falhas ?? 0),
  };
}

// ============================================================
// Painel de métricas (KPIs — Seção 1.6 do escopo)
// ============================================================

export async function metricas() {
  const [corretores, imoveis, parcerias, funil] = await Promise.all([
    query<{ total: string; ativos: string; pendentes: string }>(
      `SELECT count(*)::text AS total,
              count(*) FILTER (WHERE status = 'ativo')::text AS ativos,
              count(*) FILTER (WHERE status = 'verificacao_pendente')::text AS pendentes
       FROM corretor`,
    ),
    query<{ total: string; na_vitrine: string; em_negociacao: string; vendidos: string }>(
      `SELECT count(*)::text AS total,
              count(*) FILTER (
                WHERE status = 'ativo' AND jsonb_array_length(fotos) >= 5
                  AND jsonb_array_length(diferenciais) >= 1
                  AND quartos IS NOT NULL AND banheiros IS NOT NULL AND vagas IS NOT NULL
              )::text AS na_vitrine,
              count(*) FILTER (WHERE status = 'em_negociacao')::text AS em_negociacao,
              count(*) FILTER (WHERE status = 'vendido')::text AS vendidos
       FROM imovel`,
    ),
    query<{
      total: string;
      iniciadas: string;
      confirmacoes: string;
      vendas: string;
      volume: string;
      taxa_total: string;
      taxa_recebida: string;
      taxa_pendente: string;
    }>(
      `SELECT count(*)::text AS total,
              count(*) FILTER (WHERE status IN ('aceita','em_negociacao','vendida','encerrada'))::text AS iniciadas,
              count(*) FILTER (WHERE confirmada_em IS NOT NULL)::text AS confirmacoes,
              count(*) FILTER (WHERE venda_declarada_em IS NOT NULL)::text AS vendas,
              coalesce(sum(venda_valor), 0)::text AS volume,
              coalesce(sum(taxa_plataforma), 0)::text AS taxa_total,
              coalesce(sum(taxa_plataforma) FILTER (WHERE pagamento_status = 'confirmado'), 0)::text AS taxa_recebida,
              coalesce(sum(taxa_plataforma) FILTER (WHERE pagamento_status = 'pendente'), 0)::text AS taxa_pendente
       FROM parceria`,
    ),
    query<{ iniciados: string; concluidos: string }>(
      `SELECT count(*)::text AS iniciados,
              count(*) FILTER (WHERE concluido_em IS NOT NULL)::text AS concluidos
       FROM cadastro_imovel_sessao`,
    ),
  ]);

  const c = corretores.rows[0];
  const i = imoveis.rows[0];
  const p = parcerias.rows[0];
  const f = funil.rows[0];
  const n = (v: string) => Number(v);
  const iniciados = n(f.iniciados);
  const concluidos = n(f.concluidos);
  const taxaAbandono = iniciados > 0 ? Math.round(((iniciados - concluidos) / iniciados) * 100) : 0;

  return {
    corretores: { total: n(c.total), ativos: n(c.ativos), pendentes: n(c.pendentes) },
    imoveis: {
      total: n(i.total),
      na_vitrine: n(i.na_vitrine),
      em_negociacao: n(i.em_negociacao),
      vendidos: n(i.vendidos),
    },
    parcerias: {
      total: n(p.total),
      iniciadas: n(p.iniciadas),
      confirmacoes_bilaterais: n(p.confirmacoes),
      vendas: n(p.vendas),
      volume_vendas: n(p.volume),
      taxa_total: n(p.taxa_total),
      taxa_recebida: n(p.taxa_recebida),
      taxa_pendente: n(p.taxa_pendente),
    },
    funil_cadastro: {
      iniciados,
      concluidos,
      taxa_abandono: taxaAbandono,
    },
  };
}

// ============================================================
// Gestão de administradores (usuario_equipe)
// ============================================================

interface AdminRow {
  id: string;
  nome: string;
  email: string;
  criado_em: string;
}

export async function listarAdmins() {
  const { rows } = await query<AdminRow>(
    'SELECT id, nome, email, criado_em FROM usuario_equipe ORDER BY criado_em ASC',
  );
  return { data: rows };
}

export async function criarAdmin(input: CriarAdminInput) {
  const dupe = await query<{ id: string }>('SELECT id FROM usuario_equipe WHERE email = $1', [
    input.email,
  ]);
  if (dupe.rowCount) {
    throw conflict('E-mail já cadastrado.', { email: 'Este e-mail já está cadastrado.' });
  }

  const senhaHash = await hashPassword(input.senha);
  const { rows } = await query<AdminRow>(
    `INSERT INTO usuario_equipe (nome, email, senha_hash)
     VALUES ($1, $2, $3)
     RETURNING id, nome, email, criado_em`,
    [input.nome, input.email, senhaHash],
  );
  return rows[0];
}

async function fetchStatus(id: string): Promise<{ status: string; email: string; nome: string }> {
  const { rows } = await query<{ status: string; email: string; nome: string }>(
    'SELECT status, email, nome FROM corretor WHERE id = $1',
    [id],
  );
  if (!rows[0]) throw notFound('Corretor não encontrado.');
  return rows[0];
}

export async function aprovarCorretor(id: string, equipeId: string) {
  const atual = await fetchStatus(id);
  if (atual.status !== 'verificacao_pendente') {
    throw conflict('Corretor já foi processado.');
  }

  await query(
    `UPDATE corretor
     SET status = 'ativo', creci_verificado_em = now(), verificado_por = $2,
         motivo_rejeicao = NULL, atualizado_em = now()
     WHERE id = $1`,
    [id, equipeId],
  );

  await sendEmail({
    to: atual.email,
    ...emailCreciAprovado(atual.nome, `${env.APP_WEB_URL}/login`),
  });

  return { id, status: 'ativo' as const };
}

export async function rejeitarCorretor(id: string, equipeId: string, motivo: string) {
  const atual = await fetchStatus(id);
  if (atual.status !== 'verificacao_pendente') {
    throw conflict('Corretor já foi processado.');
  }

  await query(
    `UPDATE corretor
     SET status = 'rejeitado', motivo_rejeicao = $3, verificado_por = $2, atualizado_em = now()
     WHERE id = $1`,
    [id, equipeId, motivo],
  );

  await sendEmail({
    to: atual.email,
    ...emailCreciRejeitado(atual.nome, motivo, `${env.APP_WEB_URL}/perfil/rejeitado`),
  });

  return { id, status: 'rejeitado' as const };
}

// ============================================================
// Verificação de exclusividade (Fase 2/7.5)
// ============================================================

interface ExclusividadeRow {
  id: string;
  bairro: string;
  cidade: string;
  tipo: string;
  preco: string;
  exclusividade_contrato_url: string | null;
  exclusividade_vencimento: string | null;
  corretor_nome: string;
  corretor_creci: string | null;
  criado_em: string;
}

export async function listarExclusividadesPendentes() {
  const { rows } = await query<ExclusividadeRow>(
    `SELECT i.id, i.bairro, i.cidade, i.tipo, i.preco::text AS preco,
            i.exclusividade_contrato_url,
            i.exclusividade_vencimento::text AS exclusividade_vencimento,
            i.criado_em, c.nome AS corretor_nome, c.creci AS corretor_creci
     FROM imovel i
     JOIN corretor c ON c.id = i.corretor_id
     WHERE i.exclusividade_status = 'pendente'
     ORDER BY i.criado_em ASC`,
  );
  return { data: rows.map((r) => ({ ...r, preco: Number(r.preco) })) };
}

export async function verificarExclusividade(id: string) {
  const { rowCount } = await query(
    `UPDATE imovel
     SET exclusividade_status = 'verificada', exclusividade_verificada = true, atualizado_em = now()
     WHERE id = $1 AND exclusividade_status = 'pendente'`,
    [id],
  );
  if (!rowCount) throw notFound('Imóvel não encontrado ou já processado.');
  return { id, exclusividade_status: 'verificada' as const };
}

export async function rejeitarExclusividade(id: string) {
  const { rowCount } = await query(
    `UPDATE imovel
     SET exclusividade_status = 'rejeitada', exclusividade_verificada = false, atualizado_em = now()
     WHERE id = $1 AND exclusividade_status = 'pendente'`,
    [id],
  );
  if (!rowCount) throw notFound('Imóvel não encontrado ou já processado.');
  return { id, exclusividade_status: 'rejeitada' as const };
}
