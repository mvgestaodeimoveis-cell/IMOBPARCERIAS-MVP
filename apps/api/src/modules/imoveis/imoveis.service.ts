import { pool, query } from '../../db/pool';
import { conflict, forbidden, notFound } from '../../lib/errors';
import type {
  AtualizarImovelInput,
  CriarImovelInput,
  VitrineQuery,
} from './imoveis.schemas';

export interface Imovel {
  id: string;
  corretor_id: string;
  finalidade: string;
  tipo: string;
  preco: number;
  cidade: string;
  bairro: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  area_m2: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  descricao: string | null;
  fotos: string[];
  diferenciais: string[];
  exclusividade_verificada: boolean;
  status: string;
  origem: string;
  link_origem: string | null;
  criado_em: string;
  atualizado_em: string;
}

interface ImovelRow extends Omit<Imovel, 'preco' | 'area_m2'> {
  preco: string;
  area_m2: string | null;
}

const COLUNAS = `id, corretor_id, finalidade, tipo, preco, cidade, bairro, cep, logradouro,
  numero, complemento, area_m2, quartos, suites, banheiros, vagas, descricao, fotos, diferenciais,
  exclusividade_verificada, status, origem, link_origem, criado_em, atualizado_em`;

// Nível 1 (vitrine pública): NUNCA expõe logradouro, número, complemento ou CEP.
const COLUNAS_VITRINE = `id, finalidade, tipo, preco, cidade, bairro, area_m2, quartos,
  banheiros, vagas, fotos, diferenciais, exclusividade_verificada, status, criado_em`;

function mapImovel(row: ImovelRow): Imovel {
  return {
    ...row,
    preco: Number(row.preco),
    area_m2: row.area_m2 === null ? null : Number(row.area_m2),
  };
}

/** Chave global de exclusividade: CEP + número + complemento (normalizados). */
function chaveDedupe(cep: string, numero: string, complemento: string | null): string {
  return `${cep}|${numero.trim().toLowerCase()}|${(complemento ?? '').trim().toLowerCase()}`;
}

async function garantirCorretorAtivo(corretorId: string): Promise<void> {
  const { rows } = await query<{ status: string }>('SELECT status FROM corretor WHERE id = $1', [
    corretorId,
  ]);
  if (!rows[0]) throw notFound('Corretor não encontrado.');
  if (rows[0].status !== 'ativo') {
    throw forbidden('Seu cadastro precisa estar aprovado para publicar imóveis.');
  }
}

async function checarDuplicata(chave: string, corretorId: string, ignorarId?: string): Promise<void> {
  const params: unknown[] = [chave];
  let sql = `SELECT corretor_id FROM imovel WHERE chave_dedupe = $1 AND status = 'ativo'`;
  if (ignorarId) {
    params.push(ignorarId);
    sql += ` AND id <> $${params.length}`;
  }
  const { rows } = await query<{ corretor_id: string }>(sql, params);
  const existente = rows[0];
  if (existente) {
    if (existente.corretor_id === corretorId) {
      throw conflict('Você já cadastrou este imóvel.');
    }
    throw conflict(
      'Este imóvel já foi cadastrado por outro corretor (exclusividade verificada).',
    );
  }
}

export async function criarImovel(corretorId: string, input: CriarImovelInput): Promise<Imovel> {
  await garantirCorretorAtivo(corretorId);
  const chave = chaveDedupe(input.cep, input.numero, input.complemento);
  await checarDuplicata(chave, corretorId);

  try {
    const { rows } = await query<ImovelRow>(
      `INSERT INTO imovel
         (corretor_id, finalidade, tipo, preco, cidade, bairro, cep, logradouro, numero,
          complemento, area_m2, quartos, suites, banheiros, vagas, descricao, fotos, diferenciais,
          chave_dedupe, origem, link_origem)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING ${COLUNAS}`,
      [
        corretorId,
        input.finalidade,
        input.tipo,
        input.preco,
        input.cidade,
        input.bairro,
        input.cep,
        input.logradouro,
        input.numero,
        input.complemento,
        input.area_m2 ?? null,
        input.quartos ?? null,
        input.suites ?? null,
        input.banheiros ?? null,
        input.vagas ?? null,
        input.descricao,
        JSON.stringify(input.fotos ?? []),
        JSON.stringify(input.diferenciais ?? []),
        chave,
        input.link_origem ? 'importado' : 'manual',
        input.link_origem ?? null,
      ],
    );
    return mapImovel(rows[0]);
  } catch (err) {
    // Corrida no índice único parcial de exclusividade.
    if (err && typeof err === 'object' && (err as { code?: string }).code === '23505') {
      throw conflict('Este imóvel já foi cadastrado por outro corretor (exclusividade verificada).');
    }
    throw err;
  }
}

export async function listarMeusImoveis(corretorId: string): Promise<Imovel[]> {
  const { rows } = await query<ImovelRow>(
    `SELECT ${COLUNAS} FROM imovel
     WHERE corretor_id = $1 AND status <> 'inativo'
     ORDER BY criado_em DESC`,
    [corretorId],
  );
  return rows.map(mapImovel);
}

export async function obterImovelDoDono(id: string, corretorId: string): Promise<Imovel> {
  const { rows } = await query<ImovelRow>(`SELECT ${COLUNAS} FROM imovel WHERE id = $1`, [id]);
  const imovel = rows[0];
  if (!imovel || imovel.status === 'inativo') throw notFound('Imóvel não encontrado.');
  if (imovel.corretor_id !== corretorId) throw forbidden('Você não tem acesso a este imóvel.');
  return mapImovel(imovel);
}

export async function atualizarImovel(
  id: string,
  corretorId: string,
  input: AtualizarImovelInput,
): Promise<Imovel> {
  const atual = await obterImovelDoDono(id, corretorId);

  const merged = {
    finalidade: input.finalidade ?? atual.finalidade,
    tipo: input.tipo ?? atual.tipo,
    preco: input.preco ?? atual.preco,
    cidade: input.cidade ?? atual.cidade,
    bairro: input.bairro ?? atual.bairro,
    cep: input.cep ?? atual.cep,
    logradouro: input.logradouro ?? atual.logradouro,
    numero: input.numero ?? atual.numero,
    complemento: input.complemento === undefined ? atual.complemento : input.complemento,
    area_m2: input.area_m2 === undefined ? atual.area_m2 : input.area_m2,
    quartos: input.quartos === undefined ? atual.quartos : input.quartos,
    suites: input.suites === undefined ? atual.suites : input.suites,
    banheiros: input.banheiros === undefined ? atual.banheiros : input.banheiros,
    vagas: input.vagas === undefined ? atual.vagas : input.vagas,
    descricao: input.descricao === undefined ? atual.descricao : input.descricao,
    fotos: input.fotos ?? atual.fotos,
    diferenciais: input.diferenciais ?? atual.diferenciais,
    status: input.status ?? atual.status,
  };

  const chave = chaveDedupe(merged.cep, merged.numero, merged.complemento);
  if (merged.status === 'ativo') {
    await checarDuplicata(chave, corretorId, id);
  }

  const { rows } = await query<ImovelRow>(
    `UPDATE imovel SET
       finalidade = $2, tipo = $3, preco = $4, cidade = $5, bairro = $6, cep = $7,
       logradouro = $8, numero = $9, complemento = $10, area_m2 = $11, quartos = $12,
       suites = $13, banheiros = $14, vagas = $15, descricao = $16, fotos = $17,
       diferenciais = $18, status = $19, chave_dedupe = $20, atualizado_em = now()
     WHERE id = $1
     RETURNING ${COLUNAS}`,
    [
      id,
      merged.finalidade,
      merged.tipo,
      merged.preco,
      merged.cidade,
      merged.bairro,
      merged.cep,
      merged.logradouro,
      merged.numero,
      merged.complemento,
      merged.area_m2,
      merged.quartos,
      merged.suites,
      merged.banheiros,
      merged.vagas,
      merged.descricao,
      JSON.stringify(merged.fotos),
      JSON.stringify(merged.diferenciais),
      merged.status,
      chave,
    ],
  );
  return mapImovel(rows[0]);
}

/** Remoção lógica (libera a chave de exclusividade). */
export async function removerImovel(id: string, corretorId: string): Promise<void> {
  await obterImovelDoDono(id, corretorId);
  await pool.query(
    `UPDATE imovel SET status = 'inativo', atualizado_em = now() WHERE id = $1`,
    [id],
  );
}

// ============================================================
// Vitrine (Nível 1 — público). Só imóveis disponíveis com ficha completa.
// ============================================================

export interface ImovelVitrine {
  id: string;
  finalidade: string;
  tipo: string;
  preco: number;
  cidade: string;
  bairro: string;
  area_m2: number | null;
  quartos: number | null;
  banheiros: number | null;
  vagas: number | null;
  fotos: string[];
  diferenciais: string[];
  exclusividade_verificada: boolean;
  status: string;
  criado_em: string;
}

type ImovelVitrineRow = Omit<ImovelVitrine, 'preco' | 'area_m2'> & {
  preco: string;
  area_m2: string | null;
};

function mapVitrine(row: ImovelVitrineRow): ImovelVitrine {
  return {
    ...row,
    preco: Number(row.preco),
    area_m2: row.area_m2 === null ? null : Number(row.area_m2),
  };
}

// Ficha completa (Seção 2.4): mín. 5 fotos, ≥ 1 diferencial, quartos/banheiros/vagas informados.
const FICHA_COMPLETA = `status = 'ativo'
  AND jsonb_array_length(fotos) >= 5
  AND jsonb_array_length(diferenciais) >= 1
  AND quartos IS NOT NULL AND banheiros IS NOT NULL AND vagas IS NOT NULL`;

export async function listarVitrine(q: VitrineQuery) {
  const cond: string[] = [FICHA_COMPLETA];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    cond.push(sql.replace('$?', `$${params.length}`));
  };

  if (q.tipo) add('tipo = $?', q.tipo);
  if (q.finalidade) add('finalidade = $?', q.finalidade);
  if (q.cidade) add('cidade ILIKE $?', `%${q.cidade}%`);
  if (q.bairro) add('bairro ILIKE $?', `%${q.bairro}%`);
  if (q.preco_min != null) add('preco >= $?', q.preco_min);
  if (q.preco_max != null) add('preco <= $?', q.preco_max);
  if (q.area_min != null) add('area_m2 >= $?', q.area_min);
  if (q.quartos_min != null) add('quartos >= $?', q.quartos_min);

  const where = `WHERE ${cond.join(' AND ')}`;

  const totalRes = await query<{ count: string }>(
    `SELECT count(*)::text AS count FROM imovel ${where}`,
    params,
  );
  const total = Number(totalRes.rows[0]?.count ?? 0);

  const offset = (q.page - 1) * q.page_size;
  const dataRes = await query<ImovelVitrineRow>(
    `SELECT ${COLUNAS_VITRINE} FROM imovel ${where}
     ORDER BY exclusividade_verificada DESC, criado_em DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, q.page_size, offset],
  );

  return { data: dataRes.rows.map(mapVitrine), page: q.page, page_size: q.page_size, total };
}

export async function obterVitrine(id: string): Promise<ImovelVitrine> {
  const { rows } = await query<ImovelVitrineRow>(
    `SELECT ${COLUNAS_VITRINE} FROM imovel WHERE id = $1 AND ${FICHA_COMPLETA}`,
    [id],
  );
  if (!rows[0]) throw notFound('Imóvel não encontrado ou indisponível.');
  return mapVitrine(rows[0]);
}
