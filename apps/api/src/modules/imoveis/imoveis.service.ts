import { pool, query } from '../../db/pool';
import { env } from '../../config/env';
import { conflict, duplicataPossivel, forbidden, notFound } from '../../lib/errors';
import { sendEmail } from '../../lib/email';
import { emailExclusividadeVencendo, emailManutencaoImovel } from '../../lib/email-templates';
import { TERMO_PARCERIA_HASH, TERMO_PARCERIA_VERSAO } from '../../lib/termo-parceria';
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
  unidade: string | null;
  andar: string | null;
  bloco: string | null;
  nome_condominio: string | null;
  area_m2: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  descricao: string | null;
  fotos: string[];
  diferenciais: string[];
  documentacao: string[];
  exclusividade_verificada: boolean;
  exclusividade: boolean;
  exclusividade_contrato_url: string | null;
  exclusividade_vencimento: string | null;
  exclusividade_status: string;
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
  numero, complemento, unidade, andar, bloco, nome_condominio, area_m2, quartos, suites, banheiros,
  vagas, descricao, fotos, diferenciais, documentacao, exclusividade_verificada, exclusividade,
  exclusividade_contrato_url, exclusividade_vencimento::text AS exclusividade_vencimento,
  exclusividade_status, status, origem, link_origem, criado_em, atualizado_em`;

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

interface CamposChave {
  tipo: string;
  cidade: string;
  logradouro: string;
  numero: string;
  unidade: string | null;
  andar: string | null;
  bloco: string | null;
  nome_condominio: string | null;
  area_m2: number | null;
}

const norm = (s: string | null | undefined): string => (s ?? '').trim().toLowerCase();

function baseEndereco(c: CamposChave): string {
  return `${norm(c.cidade)}|${norm(c.logradouro)}|${norm(c.numero)}`;
}

/** Chave única por tipo de imóvel (Seção 5 do escopo). */
function chaveDedupe(c: CamposChave): string {
  const base = baseEndereco(c);
  switch (c.tipo) {
    case 'apartamento':
      return `apt|${base}|${norm(c.unidade)}|${norm(c.andar)}|${norm(c.bloco)}`;
    case 'comercial':
      return `com|${base}|${norm(c.unidade)}`;
    case 'terreno':
      return `ter|${base}|${c.area_m2 ?? ''}`;
    case 'casa':
      return c.nome_condominio
        ? `casacond|${norm(c.cidade)}|${norm(c.nome_condominio)}|${norm(c.numero)}`
        : `casa|${base}`;
    default:
      return `x|${base}`;
  }
}

/** Chave do prédio (endereço-base) para detectar DUPLICATA POSSÍVEL. */
function chavePredio(c: CamposChave): string {
  return `predio|${baseEndereco(c)}`;
}

function camposDe(input: {
  tipo: string;
  cidade: string;
  logradouro: string;
  numero: string;
  unidade: string | null;
  andar: string | null;
  bloco: string | null;
  nome_condominio: string | null;
  area_m2: number | null;
}): CamposChave {
  return {
    tipo: input.tipo,
    cidade: input.cidade,
    logradouro: input.logradouro,
    numero: input.numero,
    unidade: input.unidade,
    andar: input.andar,
    bloco: input.bloco,
    nome_condominio: input.nome_condominio,
    area_m2: input.area_m2,
  };
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

/**
 * Verifica duplicata (Seção 5): EXATA bloqueia; POSSÍVEL (mesmo prédio, unidade
 * diferente em apto/comercial) exige confirmação manual do corretor.
 */
async function checarDuplicata(
  c: CamposChave,
  corretorId: string,
  confirmarDistinto: boolean,
  ignorarId?: string,
): Promise<{ chave: string; predio: string }> {
  const chave = chaveDedupe(c);
  const predio = chavePredio(c);

  const p1: unknown[] = [chave];
  let sql1 = `SELECT corretor_id FROM imovel WHERE chave_dedupe = $1 AND status = 'ativo'`;
  if (ignorarId) {
    p1.push(ignorarId);
    sql1 += ` AND id <> $${p1.length}`;
  }
  const exata = await query<{ corretor_id: string }>(sql1, p1);
  if (exata.rows[0]) {
    throw conflict(
      exata.rows[0].corretor_id === corretorId
        ? 'Você já cadastrou este imóvel.'
        : 'Este imóvel já foi cadastrado por outro corretor (exclusividade verificada).',
    );
  }

  if ((c.tipo === 'apartamento' || c.tipo === 'comercial') && !confirmarDistinto) {
    const p2: unknown[] = [predio];
    let sql2 = `SELECT id FROM imovel WHERE chave_predio = $1 AND status = 'ativo'`;
    if (ignorarId) {
      p2.push(ignorarId);
      sql2 += ` AND id <> $${p2.length}`;
    }
    sql2 += ' LIMIT 1';
    const poss = await query<{ id: string }>(sql2, p2);
    if (poss.rows[0]) {
      throw duplicataPossivel(
        'Já existe um imóvel neste mesmo endereço/prédio. Confirme que é uma unidade diferente para continuar.',
      );
    }
  }

  return { chave, predio };
}

export async function criarImovel(
  corretorId: string,
  input: CriarImovelInput,
  contexto: { ip: string; userAgent: string },
): Promise<Imovel> {
  await garantirCorretorAtivo(corretorId);
  const campos = camposDe({ ...input, area_m2: input.area_m2 ?? null });
  const { chave, predio } = await checarDuplicata(
    campos,
    corretorId,
    input.confirmar_distinto ?? false,
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<ImovelRow>(
      `INSERT INTO imovel
         (corretor_id, finalidade, tipo, preco, cidade, bairro, cep, logradouro, numero,
          complemento, unidade, andar, bloco, nome_condominio, area_m2, quartos, suites, banheiros,
          vagas, descricao, fotos, diferenciais, documentacao, chave_dedupe, chave_predio, origem,
          link_origem, exclusividade, exclusividade_contrato_url, exclusividade_vencimento,
          exclusividade_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
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
        input.unidade,
        input.andar,
        input.bloco,
        input.nome_condominio,
        input.area_m2 ?? null,
        input.quartos ?? null,
        input.suites ?? null,
        input.banheiros ?? null,
        input.vagas ?? null,
        input.descricao,
        JSON.stringify(input.fotos ?? []),
        JSON.stringify(input.diferenciais ?? []),
        JSON.stringify(input.documentacao ?? []),
        chave,
        predio,
        input.link_origem ? 'importado' : 'manual',
        input.link_origem ?? null,
        input.exclusividade ?? false,
        input.exclusividade_contrato_url ?? null,
        input.exclusividade_vencimento ?? null,
        input.exclusividade ? 'pendente' : 'nao',
      ],
    );
    const imovel = rows[0];
    await client.query(
      `INSERT INTO termo_parceria_aceite
         (imovel_id, corretor_id, creci, versao, documento_hash, ip, user_agent)
       VALUES ($1, $2, (SELECT creci FROM corretor WHERE id = $2), $3, $4, $5, $6)`,
      [
        imovel.id,
        corretorId,
        TERMO_PARCERIA_VERSAO,
        TERMO_PARCERIA_HASH,
        contexto.ip,
        contexto.userAgent,
      ],
    );
    await client.query('COMMIT');
    return mapImovel(imovel);
  } catch (err) {
    await client.query('ROLLBACK');
    // Corrida no índice único parcial de exclusividade.
    if (err && typeof err === 'object' && (err as { code?: string }).code === '23505') {
      throw conflict('Este imóvel já foi cadastrado por outro corretor (exclusividade verificada).');
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function listarMeusImoveis(corretorId: string): Promise<Imovel[]> {
  const { rows } = await query<ImovelRow>(
    `SELECT ${COLUNAS} FROM imovel
     WHERE corretor_id = $1
     ORDER BY (status = 'inativo'), (status = 'vendido'), criado_em DESC`,
    [corretorId],
  );
  return rows.map(mapImovel);
}

export async function obterImovelDoDono(id: string, corretorId: string): Promise<Imovel> {
  const { rows } = await query<ImovelRow>(`SELECT ${COLUNAS} FROM imovel WHERE id = $1`, [id]);
  const imovel = rows[0];
  if (!imovel) throw notFound('Imóvel não encontrado.');
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
    unidade: input.unidade === undefined ? atual.unidade : input.unidade,
    andar: input.andar === undefined ? atual.andar : input.andar,
    bloco: input.bloco === undefined ? atual.bloco : input.bloco,
    nome_condominio: input.nome_condominio === undefined ? atual.nome_condominio : input.nome_condominio,
    area_m2: input.area_m2 === undefined ? atual.area_m2 : input.area_m2,
    quartos: input.quartos === undefined ? atual.quartos : input.quartos,
    suites: input.suites === undefined ? atual.suites : input.suites,
    banheiros: input.banheiros === undefined ? atual.banheiros : input.banheiros,
    vagas: input.vagas === undefined ? atual.vagas : input.vagas,
    descricao: input.descricao === undefined ? atual.descricao : input.descricao,
    fotos: input.fotos ?? atual.fotos,
    diferenciais: input.diferenciais ?? atual.diferenciais,
    documentacao: input.documentacao ?? atual.documentacao,
    status: input.status ?? atual.status,
  };

  const campos = camposDe(merged);
  let chave = chaveDedupe(campos);
  let predio = chavePredio(campos);
  if (merged.status === 'ativo') {
    const r = await checarDuplicata(campos, corretorId, input.confirmar_distinto ?? false, id);
    chave = r.chave;
    predio = r.predio;
  }

  const { rows } = await query<ImovelRow>(
    `UPDATE imovel SET
       finalidade = $2, tipo = $3, preco = $4, cidade = $5, bairro = $6, cep = $7,
       logradouro = $8, numero = $9, complemento = $10, unidade = $11, andar = $12, bloco = $13,
       nome_condominio = $14, area_m2 = $15, quartos = $16, suites = $17, banheiros = $18,
       vagas = $19, descricao = $20, fotos = $21, diferenciais = $22, documentacao = $23,
       status = $24, chave_dedupe = $25, chave_predio = $26, atualizado_em = now()
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
      merged.unidade,
      merged.andar,
      merged.bloco,
      merged.nome_condominio,
      merged.area_m2,
      merged.quartos,
      merged.suites,
      merged.banheiros,
      merged.vagas,
      merged.descricao,
      JSON.stringify(merged.fotos),
      JSON.stringify(merged.diferenciais),
      JSON.stringify(merged.documentacao),
      merged.status,
      chave,
      predio,
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

/** Job mensal (Fase 3): inativa imóveis disponíveis sem atualização há N dias. */
export async function marcarImoveisInativos(dias: number): Promise<number> {
  const { rowCount } = await query(
    `UPDATE imovel
     SET status = 'inativo', atualizado_em = now()
     WHERE status = 'ativo'
       AND atualizado_em < now() - ($1 || ' days')::interval`,
    [String(dias)],
  );
  return rowCount ?? 0;
}

// Manutenção mensal escalonada (Fase 3): 1º aviso 30d → 2º aviso +7d → INATIVO +5d.
const DIAS_AVISO1 = 30;
const DIAS_AVISO2 = 7; // após o 1º aviso
const DIAS_INATIVAR = 5; // após o 2º aviso

interface ManutencaoRow {
  id: string;
  tipo: string;
  bairro: string;
  cidade: string;
  nome: string;
  email: string;
}

export async function executarManutencaoImoveis(): Promise<{
  aviso1: number;
  aviso2: number;
  inativados: number;
}> {
  // 0) Reset: imóvel atualizado depois do aviso reinicia o ciclo (confirmação).
  await query(
    `UPDATE imovel
     SET manutencao_aviso1_em = NULL, manutencao_aviso2_em = NULL
     WHERE manutencao_aviso1_em IS NOT NULL AND atualizado_em > manutencao_aviso1_em`,
  );

  // 1) Inativa quem não confirmou após o 2º aviso.
  const inativadosRes = await query(
    `UPDATE imovel
     SET status = 'inativo', atualizado_em = now()
     WHERE status = 'ativo'
       AND manutencao_aviso2_em IS NOT NULL
       AND manutencao_aviso2_em < now() - ($1 || ' days')::interval`,
    [String(DIAS_INATIVAR)],
  );

  // 2) 2º aviso: passou o prazo do 1º aviso sem confirmação.
  const aviso2Rows = await query<ManutencaoRow>(
    `SELECT i.id, i.tipo, i.bairro, i.cidade, c.nome, c.email
     FROM imovel i JOIN corretor c ON c.id = i.corretor_id
     WHERE i.status = 'ativo'
       AND i.manutencao_aviso1_em IS NOT NULL
       AND i.manutencao_aviso2_em IS NULL
       AND i.manutencao_aviso1_em < now() - ($1 || ' days')::interval`,
    [String(DIAS_AVISO2)],
  );
  for (const r of aviso2Rows.rows) {
    await notificarManutencao(r, true);
    await query('UPDATE imovel SET manutencao_aviso2_em = now() WHERE id = $1', [r.id]);
  }

  // 3) 1º aviso: sem atualização há mais de 30 dias.
  const aviso1Rows = await query<ManutencaoRow>(
    `SELECT i.id, i.tipo, i.bairro, i.cidade, c.nome, c.email
     FROM imovel i JOIN corretor c ON c.id = i.corretor_id
     WHERE i.status = 'ativo'
       AND i.manutencao_aviso1_em IS NULL
       AND i.atualizado_em < now() - ($1 || ' days')::interval`,
    [String(DIAS_AVISO1)],
  );
  for (const r of aviso1Rows.rows) {
    await notificarManutencao(r, false);
    await query('UPDATE imovel SET manutencao_aviso1_em = now() WHERE id = $1', [r.id]);
  }

  return {
    aviso1: aviso1Rows.rowCount ?? 0,
    aviso2: aviso2Rows.rowCount ?? 0,
    inativados: inativadosRes.rowCount ?? 0,
  };
}

async function notificarManutencao(r: ManutencaoRow, segundoAviso: boolean): Promise<void> {
  await sendEmail({
    to: r.email,
    ...emailManutencaoImovel(r.nome, r.tipo, r.bairro, r.cidade, `${env.APP_WEB_URL}/imoveis/${r.id}`, segundoAviso),
  });
}

/** Alerta de vencimento de exclusividade (15 dias antes) — envia e-mail uma vez. */
export async function alertarExclusividadeVencendo(): Promise<number> {
  const { rows } = await query<{
    id: string;
    tipo: string;
    bairro: string;
    cidade: string;
    vencimento: string;
    nome: string;
    email: string;
  }>(
    `SELECT i.id, i.tipo, i.bairro, i.cidade,
            i.exclusividade_vencimento::text AS vencimento,
            c.nome, c.email
     FROM imovel i JOIN corretor c ON c.id = i.corretor_id
     WHERE i.exclusividade_status = 'verificada'
       AND i.exclusividade_vencimento IS NOT NULL
       AND i.exclusividade_alerta_em IS NULL
       AND i.exclusividade_vencimento >= current_date
       AND i.exclusividade_vencimento <= current_date + 15`,
  );
  for (const r of rows) {
    await sendEmail({
      to: r.email,
      ...emailExclusividadeVencendo(
        r.nome,
        r.tipo,
        r.bairro,
        r.cidade,
        new Date(r.vencimento).toLocaleDateString('pt-BR'),
        `${env.APP_WEB_URL}/imoveis/${r.id}`,
      ),
    });
    await query('UPDATE imovel SET exclusividade_alerta_em = now() WHERE id = $1', [r.id]);
  }
  return rows.length;
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
