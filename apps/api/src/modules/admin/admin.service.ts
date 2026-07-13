import { query } from '../../db/pool';
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
}

export async function listCorretores(q: ListCorretoresQuery) {
  const conditions: string[] = [];
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
  const dataRes = await query<CorretorListRow>(
    `SELECT id, nome, creci, cidade, status, criado_em
     FROM corretor ${where}
     ORDER BY criado_em ASC
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
