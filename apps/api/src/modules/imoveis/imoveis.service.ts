import { pool, query } from '../../db/pool';
import { conflict, forbidden, notFound } from '../../lib/errors';
import type { AtualizarImovelInput, CriarImovelInput } from './imoveis.schemas';

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
  numero, complemento, area_m2, quartos, suites, banheiros, vagas, descricao, fotos,
  status, origem, link_origem, criado_em, atualizado_em`;

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
          complemento, area_m2, quartos, suites, banheiros, vagas, descricao, fotos, chave_dedupe,
          origem, link_origem)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
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
       status = $18, chave_dedupe = $19, atualizado_em = now()
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
