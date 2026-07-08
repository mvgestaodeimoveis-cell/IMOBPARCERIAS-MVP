import { query } from '../../db/pool';
import { conflict, notFound } from '../../lib/errors';
import { sendEmail } from '../../lib/email';
import type { ListCorretoresQuery } from './admin.schemas';

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
    subject: 'Imob Parcerias — cadastro aprovado',
    html: `<p>Olá, ${atual.nome}. Seu CRECI foi verificado e seu perfil está <strong>ativo</strong>.</p>`,
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
    subject: 'Imob Parcerias — cadastro não aprovado',
    html: `<p>Olá, ${atual.nome}. Seu cadastro não foi aprovado.</p><p><strong>Motivo:</strong> ${motivo}</p>`,
  });

  return { id, status: 'rejeitado' as const };
}
