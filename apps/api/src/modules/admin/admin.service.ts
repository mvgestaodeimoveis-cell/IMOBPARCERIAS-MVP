import { query } from '../../db/pool';
import { env } from '../../config/env';
import { conflict, notFound } from '../../lib/errors';
import { hashPassword } from '../../lib/password';
import { sendEmail } from '../../lib/email';
import { emailCreciAprovado, emailCreciRejeitado } from '../../lib/email-templates';
import type { CriarAdminInput, ListCorretoresQuery } from './admin.schemas';

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

// ============================================================
// Painel de métricas (KPIs — Seção 1.6 do escopo)
// ============================================================

export async function metricas() {
  const [corretores, imoveis, parcerias] = await Promise.all([
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
  ]);

  const c = corretores.rows[0];
  const i = imoveis.rows[0];
  const p = parcerias.rows[0];
  const n = (v: string) => Number(v);

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
