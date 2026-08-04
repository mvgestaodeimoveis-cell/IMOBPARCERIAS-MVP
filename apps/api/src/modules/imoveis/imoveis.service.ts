import { pool, query } from '../../db/pool';
import { env } from '../../config/env';
import { conflict, duplicataPossivel, forbidden, notFound } from '../../lib/errors';
import { sendEmail } from '../../lib/email';
import { emailExclusividadeVencendo, emailManutencaoImovel } from '../../lib/email-templates';
import { TERMO_PARCERIA_HASH, TERMO_PARCERIA_VERSAO } from '../../lib/termo-parceria';
import {
  chaveDedupe,
  chavePredio,
  precosProximos,
  PRECO_RATIO_ENDERECO,
  PRECO_RATIO_BAIRRO,
  type CamposChave,
} from './dedupe';
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
  em_condominio: boolean;
  nome_condominio: string | null;
  condominio_infraestrutura: string[];
  condominio: number | null;
  iptu: number | null;
  taxas_inclusas: boolean;
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

interface ImovelRow extends Omit<Imovel, 'preco' | 'area_m2' | 'condominio' | 'iptu'> {
  preco: string;
  area_m2: string | null;
  condominio: string | null;
  iptu: string | null;
}

const COLUNAS = `id, corretor_id, finalidade, tipo, preco, cidade, bairro, cep, logradouro,
  numero, complemento, unidade, andar, bloco, em_condominio, nome_condominio,
  condominio_infraestrutura, condominio, iptu, taxas_inclusas,
  area_m2, quartos, suites, banheiros,
  vagas, descricao, fotos, diferenciais, documentacao, exclusividade_verificada, exclusividade,
  exclusividade_contrato_url, exclusividade_vencimento::text AS exclusividade_vencimento,
  exclusividade_status, status, origem, link_origem, criado_em, atualizado_em`;

// Nível 1 (vitrine pública): NUNCA expõe logradouro, número, complemento ou CEP.
// O NOME do condomínio também fica oculto (identifica o prédio) — só a infraestrutura e o valor.
const COLUNAS_VITRINE = `id, finalidade, tipo, preco, cidade, bairro, em_condominio,
  condominio_infraestrutura, condominio, iptu, taxas_inclusas,
  area_m2, quartos, suites, banheiros, vagas, fotos, diferenciais, exclusividade_verificada, status,
  criado_em, atualizado_em`;

function mapImovel(row: ImovelRow): Imovel {
  return {
    ...row,
    preco: Number(row.preco),
    condominio: row.condominio === null ? null : Number(row.condominio),
    iptu: row.iptu === null ? null : Number(row.iptu),
    area_m2: row.area_m2 === null ? null : Number(row.area_m2),
  };
}

function camposDe(input: {
  tipo: string;
  cep: string;
  cidade: string;
  bairro: string;
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
    cep: input.cep,
    cidade: input.cidade,
    bairro: input.bairro,
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
  const status = rows[0].status;
  if (status !== 'ativo') {
    // Mensagem específica por situação — antes um corretor com cadastro incompleto recebia
    // "precisa estar aprovado" e não entendia que faltava concluir o próprio cadastro.
    if (status === 'cadastro_incompleto') {
      throw forbidden('Conclua seu cadastro (CRECI e dados profissionais) para publicar imóveis.');
    }
    if (status === 'verificacao_pendente') {
      throw forbidden(
        'Seu cadastro está em análise. Assim que o CRECI for aprovado, você poderá publicar imóveis.',
      );
    }
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
  let sql1 = `SELECT id, corretor_id, bairro, logradouro, numero FROM imovel WHERE chave_dedupe = $1 AND status = 'ativo'`;
  if (ignorarId) {
    p1.push(ignorarId);
    sql1 += ` AND id <> $${p1.length}`;
  }
  const exata = await query<{ id: string; corretor_id: string; bairro: string; logradouro: string; numero: string }>(sql1, p1);
  if (exata.rows[0]) {
    const dup = exata.rows[0];
    const onde = `${dup.logradouro}, ${dup.numero} — ${dup.bairro}`;
    if (dup.corretor_id !== corretorId) {
      throw conflict(
        `Este endereço (${onde}) já foi cadastrado por outro corretor e está com exclusividade na plataforma.`,
      );
    }
    // Mesmo corretor. Apartamento/comercial têm chave precisa (unidade/andar) → bloqueio
    // direto. Casa/terreno usam CEP+número: em CEP "geral" imóveis diferentes podem
    // colidir, então viram "duplicata possível" (o corretor confirma que é outro imóvel).
    const chavePrecisa = c.tipo === 'apartamento' || c.tipo === 'comercial';
    if (chavePrecisa) {
      throw conflict(
        `Você já tem um imóvel ativo neste mesmo endereço/unidade (${onde}). Se for outra unidade, ajuste a unidade e o andar.`,
      );
    }
    if (!confirmarDistinto) {
      throw duplicataPossivel(
        `Você já tem um imóvel ativo com este mesmo CEP e número (${onde}). Se for um imóvel diferente, confirme para continuar.`,
      );
    }
    // confirmarDistinto === true: o corretor afirmou ser outro imóvel → segue.
  }

  // INATIVO com exclusividade verificada e ainda vigente: bloqueado até o vencimento (Fase 3).
  const pIn: unknown[] = [chave];
  let sqlIn = `SELECT id FROM imovel
     WHERE chave_dedupe = $1 AND status = 'inativo'
       AND exclusividade_status = 'verificada'
       AND exclusividade_vencimento IS NOT NULL
       AND exclusividade_vencimento >= current_date`;
  if (ignorarId) {
    pIn.push(ignorarId);
    sqlIn += ` AND id <> $${pIn.length}`;
  }
  const bloqueado = await query<{ id: string }>(sqlIn, pIn);
  if (bloqueado.rows[0]) {
    throw conflict(
      'Este imóvel está com exclusividade verificada e vigente; fica bloqueado para novo cadastro até o vencimento do contrato.',
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

/**
 * Rede de segurança (soft) para CASA/TERRENO. A chave de deduplicação exige endereço
 * idêntico, então dois corretores que digitam o mesmo endereço de formas diferentes
 * (abreviações, com/sem condomínio, CEP geral) cadastram o MESMO imóvel sem colidir.
 * Aqui procuramos imóveis ATIVOS de OUTRO corretor no mesmo tipo/cidade que batam por
 * UM de dois sinais E cujo PREÇO seja compatível, registrando uma "duplicata suspeita":
 *   (a) MESMO ENDEREÇO digitado (logradouro + número) — sinal forte → tolera até ~30%
 *       de diferença de preço (PRECO_RATIO_ENDERECO); ou
 *   (b) MESMO BAIRRO — sinal fraco → exige preços quase iguais (PRECO_RATIO_BAIRRO, ~12%).
 * O preço é filtrado em JS (precosProximos) para ser único ponto de verdade e testável.
 * NÃO bloqueia o cadastro. Best-effort: nunca quebra o fluxo.
 */
async function inserirSuspeitasPara(novo: {
  id: string;
  tipo: string;
  cidade: string;
  bairro: string;
  logradouro: string;
  numero: string;
  corretor_id: string;
  preco: number;
  chave_dedupe: string;
  criado_em?: string;
}): Promise<number> {
  if (novo.tipo !== 'casa' && novo.tipo !== 'terreno') return 0;

  const candidatos = await query<{
    id: string;
    corretor_id: string;
    logradouro: string;
    numero: string;
    preco: string;
    mesmo_endereco: boolean;
  }>(
    `SELECT id, corretor_id, logradouro, numero, preco,
            (lower(btrim(logradouro)) = lower(btrim($3)) AND lower(btrim(numero)) = lower(btrim($4))) AS mesmo_endereco
     FROM imovel
     WHERE status = 'ativo'
       AND tipo = $1
       AND lower(btrim(cidade)) = lower(btrim($2))
       AND corretor_id <> $5
       AND id <> $6
       AND chave_dedupe <> $7
       AND (
         (lower(btrim(logradouro)) = lower(btrim($3)) AND lower(btrim(numero)) = lower(btrim($4)))
         OR (lower(btrim(bairro)) = lower(btrim($8)) AND btrim($8) <> '')
       )
       ${novo.criado_em ? 'AND criado_em < $9' : ''}
     ORDER BY criado_em DESC
     LIMIT 50`,
    novo.criado_em
      ? [novo.tipo, novo.cidade, novo.logradouro, novo.numero, novo.corretor_id, novo.id, novo.chave_dedupe, novo.bairro, novo.criado_em]
      : [novo.tipo, novo.cidade, novo.logradouro, novo.numero, novo.corretor_id, novo.id, novo.chave_dedupe, novo.bairro],
  );

  // Filtro de preço em JS: mesmo endereço tolera mais; só bairro exige preço quase igual.
  const aceitos = candidatos.rows
    .filter((c) =>
      precosProximos(
        novo.preco,
        Number(c.preco),
        c.mesmo_endereco ? PRECO_RATIO_ENDERECO : PRECO_RATIO_BAIRRO,
      ),
    )
    .slice(0, 5);

  let inseridos = 0;
  for (const cand of aceitos) {
    const motivo = cand.mesmo_endereco
      ? `Mesmo endereço digitado (${novo.logradouro}, ${novo.numero} — ${novo.cidade}) por corretores diferentes, com preços compatíveis; a chave de deduplicação não colidiu (grafia/CEP diferentes).`
      : `Mesmo tipo (${novo.tipo}), cidade e bairro (${novo.bairro}, ${novo.cidade}) com preço muito próximo; endereços digitados diferentes.`;
    const { rowCount } = await query(
      `INSERT INTO imovel_duplicata_suspeita
         (imovel_novo_id, imovel_existente_id, corretor_novo_id, corretor_existente_id, motivo)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (imovel_novo_id, imovel_existente_id) DO NOTHING`,
      [novo.id, cand.id, novo.corretor_id, cand.corretor_id, motivo],
    );
    if (rowCount) {
      inseridos += 1;
      // Observabilidade: fica visível nos logs do Render para auditoria.
      console.warn(
        `[dedupe] possível duplicata: imóvel ${novo.id} (corretor ${novo.corretor_id}) ~ imóvel ${cand.id} (corretor ${cand.corretor_id}) — ${novo.tipo} ${novo.bairro}/${novo.cidade} R$${novo.preco}`,
      );
    }
  }
  return inseridos;
}

async function registrarDuplicataSuspeita(novo: Imovel, chaveNova: string): Promise<void> {
  await inserirSuspeitasPara({
    id: novo.id,
    tipo: novo.tipo,
    cidade: novo.cidade,
    bairro: novo.bairro,
    logradouro: novo.logradouro,
    numero: novo.numero,
    corretor_id: novo.corretor_id,
    preco: novo.preco,
    chave_dedupe: chaveNova,
  });
}

/**
 * Reescaneia TODOS os imóveis ativos (casa/terreno) em busca de duplicatas suspeitas
 * entre corretores diferentes. Usado pelo painel do admin para varrer imóveis que já
 * estavam na vitrine antes desta rede de segurança existir. Idempotente (ON CONFLICT
 * evita pares repetidos) e considera cada imóvel contra os MAIS ANTIGOS (evita par duplo).
 */
export async function rescanDuplicatasSuspeitas(): Promise<{ verificados: number; suspeitas: number }> {
  const { rows } = await query<{
    id: string;
    tipo: string;
    cidade: string;
    bairro: string;
    logradouro: string;
    numero: string;
    corretor_id: string;
    preco: string;
    chave_dedupe: string;
    criado_em: string;
  }>(
    `SELECT id, tipo, cidade, bairro, logradouro, numero, corretor_id,
            preco::text AS preco, chave_dedupe, criado_em::text AS criado_em
     FROM imovel
     WHERE status = 'ativo' AND tipo IN ('casa', 'terreno')
     ORDER BY criado_em ASC`,
  );
  let suspeitas = 0;
  for (const r of rows) {
    suspeitas += await inserirSuspeitasPara({
      id: r.id,
      tipo: r.tipo,
      cidade: r.cidade,
      bairro: r.bairro,
      logradouro: r.logradouro,
      numero: r.numero,
      corretor_id: r.corretor_id,
      preco: Number(r.preco),
      chave_dedupe: r.chave_dedupe,
      criado_em: r.criado_em,
    });
  }
  return { verificados: rows.length, suspeitas };
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
          complemento, unidade, andar, bloco, em_condominio, nome_condominio,
          condominio_infraestrutura, area_m2, quartos, suites, banheiros,
          vagas, descricao, fotos, diferenciais, documentacao, chave_dedupe, chave_predio, origem,
          link_origem, exclusividade, exclusividade_contrato_url, exclusividade_vencimento,
          exclusividade_status, condominio, iptu, taxas_inclusas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36)
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
        input.em_condominio ?? false,
        input.em_condominio ? input.nome_condominio ?? null : null,
        JSON.stringify(input.em_condominio ? input.condominio_infraestrutura ?? [] : []),
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
        !input.em_condominio || input.taxas_inclusas ? null : input.condominio ?? null,
        input.taxas_inclusas ? null : input.iptu ?? null,
        input.taxas_inclusas ?? false,
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
    await marcarSessaoCadastroConcluida(corretorId, imovel.id);
    const resultado = mapImovel(imovel);
    // Rede de segurança (soft) contra duplicata de casa/terreno entre corretores — não bloqueia.
    void registrarDuplicataSuspeita(resultado, chave).catch((e) =>
      console.warn('[dedupe] falha ao registrar suspeita de duplicata:', e),
    );
    return resultado;
  } catch (err) {
    await client.query('ROLLBACK');
    // Corrida no índice único parcial (chave de deduplicação / exclusividade): já existe
    // um imóvel ATIVO com este mesmo endereço.
    if (err && typeof err === 'object' && (err as { code?: string }).code === '23505') {
      throw conflict('Já existe um imóvel ativo com este mesmo endereço na plataforma.');
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Funil (KPI): abre uma sessão de cadastro quando o corretor inicia o formulário. */
export async function iniciarSessaoCadastro(corretorId: string): Promise<{ id: string }> {
  const { rows } = await query<{ id: string }>(
    'INSERT INTO cadastro_imovel_sessao (corretor_id) VALUES ($1) RETURNING id',
    [corretorId],
  );
  return { id: rows[0].id };
}

/**
 * Registra uma colagem de texto (import do WhatsApp) + os campos reconhecidos, para
 * termos histórico dos formatos que falham e evoluir o parser sem depender de o corretor
 * reenviar o texto. Best-effort: nunca quebra o fluxo de importação.
 */
export async function registrarImportTexto(
  corretorId: string | null,
  texto: string,
  reconhecidos: string[],
  origem: string,
): Promise<void> {
  try {
    await query(
      `INSERT INTO import_texto_log (corretor_id, texto, reconhecidos, reconhecidos_count, origem)
       VALUES ($1, $2, $3::jsonb, $4, $5)`,
      [corretorId, texto.slice(0, 8000), JSON.stringify(reconhecidos), reconhecidos.length, origem],
    );
  } catch (err) {
    console.error('[import-log] falha ao registrar importação de texto', err);
  }
  if (reconhecidos.length === 0) {
    console.warn(
      `[import-texto] 0 campos reconhecidos (origem=${origem}): "${texto.replace(/\s+/g, ' ').slice(0, 300)}"`,
    );
  }
}

/** Marca a sessão aberta mais recente do corretor como concluída (best-effort). */
async function marcarSessaoCadastroConcluida(corretorId: string, imovelId: string): Promise<void> {
  await query(
    `UPDATE cadastro_imovel_sessao
     SET concluido_em = now(), imovel_id = $2
     WHERE id = (
       SELECT id FROM cadastro_imovel_sessao
       WHERE corretor_id = $1 AND concluido_em IS NULL
       ORDER BY iniciado_em DESC LIMIT 1
     )`,
    [corretorId, imovelId],
  );
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
    em_condominio: input.em_condominio === undefined ? atual.em_condominio : input.em_condominio,
    nome_condominio: input.nome_condominio === undefined ? atual.nome_condominio : input.nome_condominio,
    condominio_infraestrutura:
      input.condominio_infraestrutura === undefined ? atual.condominio_infraestrutura : input.condominio_infraestrutura,
    condominio: input.condominio === undefined ? atual.condominio : input.condominio,
    iptu: input.iptu === undefined ? atual.iptu : input.iptu,
    taxas_inclusas: input.taxas_inclusas === undefined ? atual.taxas_inclusas : input.taxas_inclusas,
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
       logradouro = $8, numero = $9, complemento = $10, unidade = $11, andar = $12,
       bloco = $13, nome_condominio = $14, area_m2 = $15, quartos = $16, suites = $17,
       banheiros = $18, vagas = $19, descricao = $20, fotos = $21, diferenciais = $22,
       documentacao = $23, status = $24, chave_dedupe = $25, chave_predio = $26,
       condominio = $27, iptu = $28, taxas_inclusas = $29,
       em_condominio = $30, condominio_infraestrutura = $31, atualizado_em = now()
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
      merged.em_condominio ? merged.nome_condominio : null,
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
      !merged.em_condominio || merged.taxas_inclusas ? null : merged.condominio,
      merged.taxas_inclusas ? null : merged.iptu,
      merged.taxas_inclusas,
      merged.em_condominio,
      JSON.stringify(merged.em_condominio ? merged.condominio_infraestrutura ?? [] : []),
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
  em_condominio: boolean;
  condominio_infraestrutura: string[];
  condominio: number | null;
  iptu: number | null;
  taxas_inclusas: boolean;
  area_m2: number | null;
  quartos: number | null;
  banheiros: number | null;
  vagas: number | null;
  suites: number | null;
  fotos: string[];
  diferenciais: string[];
  exclusividade_verificada: boolean;
  status: string;
  criado_em: string;
  atualizado_em: string;
}

type ImovelVitrineRow = Omit<ImovelVitrine, 'preco' | 'area_m2' | 'condominio' | 'iptu'> & {
  preco: string;
  area_m2: string | null;
  condominio: string | null;
  iptu: string | null;
};

function mapVitrine(row: ImovelVitrineRow): ImovelVitrine {
  return {
    ...row,
    preco: Number(row.preco),
    condominio: row.condominio === null ? null : Number(row.condominio),
    iptu: row.iptu === null ? null : Number(row.iptu),
    area_m2: row.area_m2 === null ? null : Number(row.area_m2),
  };
}

// Ficha completa (Seção 2.4): mín. 5 fotos, ≥ 1 diferencial, quartos/banheiros/vagas informados.
const FICHA_COMPLETA = `status = 'ativo'
  AND jsonb_array_length(fotos) >= 5
  AND jsonb_array_length(diferenciais) >= 1
  AND quartos IS NOT NULL AND banheiros IS NOT NULL AND vagas IS NOT NULL
  AND EXISTS (SELECT 1 FROM corretor c WHERE c.id = imovel.corretor_id AND c.excluido_em IS NULL)`;

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
