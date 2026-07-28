// Deduplicação de imóveis (Seção 5): funções PURAS de geração de chave, sem
// dependências de banco/ambiente — para poder testar isoladamente.

export interface CamposChave {
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
}

const norm = (s: string | null | undefined): string => (s ?? '').trim().toLowerCase();
const soDigitos = (s: string | null | undefined): string => (s ?? '').replace(/\D/g, '');

/**
 * CEP "geral/único" de município: 8 dígitos terminados em `000` (ex.: 40000-000,
 * 44700-000). Esse tipo de CEP identifica a CIDADE inteira, não uma rua/quadra —
 * várias ruas (e bairros) compartilham o mesmo CEP. Não serve, sozinho, para
 * distinguir um imóvel de outro.
 */
export function isCepGeral(cep: string | null | undefined): boolean {
  const d = soDigitos(cep);
  return d.length === 8 && d.endsWith('000');
}

/**
 * Endereço-base canônico da deduplicação. Quando o CEP é de RUA (não termina em
 * 000), ele identifica a quadra de forma estável e é usado como âncora (`CEP|número`).
 * Quando o CEP é "geral" do município (termina em 000) ou está ausente, o CEP NÃO
 * distingue o imóvel: nesse caso ancoramos em `cidade|bairro|logradouro|número`, para
 * não colidir imóveis de ruas/bairros diferentes que tenham o mesmo número (falso
 * positivo de "você já cadastrou este imóvel").
 */
export function baseEndereco(c: CamposChave): string {
  const cep = soDigitos(c.cep);
  return cep && !isCepGeral(cep)
    ? `${cep}|${norm(c.numero)}`
    : `${norm(c.cidade)}|${norm(c.bairro)}|${norm(c.logradouro)}|${norm(c.numero)}`;
}

/** Chave única por tipo de imóvel (Seção 5 do escopo). */
export function chaveDedupe(c: CamposChave): string {
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
        ? `casacond|${soDigitos(c.cep) || norm(c.cidade)}|${norm(c.nome_condominio)}|${norm(c.numero)}`
        : `casa|${base}|${norm(c.logradouro)}`;
    default:
      return `x|${base}`;
  }
}

/** Chave do prédio (endereço-base) para detectar DUPLICATA POSSÍVEL. */
export function chavePredio(c: CamposChave): string {
  return `predio|${baseEndereco(c)}`;
}

/**
 * Limiares de proximidade de preço (razão menor/maior) usados na "duplicata suspeita".
 * O preço passa a ser um filtro de verdade: imóveis com preços muito distantes NÃO são
 * marcados como suspeitos, mesmo que endereço/bairro batam.
 *  - ENDERECO: mesmo logradouro + número (sinal forte) → tolera até ~30% de diferença.
 *  - BAIRRO: só o bairro coincide (sinal fraco) → exige preços quase iguais (~12%).
 */
export const PRECO_RATIO_ENDERECO = 0.7;
export const PRECO_RATIO_BAIRRO = 0.88;

/**
 * `true` quando os dois preços estão próximos o suficiente: razão menor/maior ≥ ratioMin.
 * Simétrico (não importa qual é o novo/existente). Preços ausentes/≤0 nunca são "próximos".
 */
export function precosProximos(a: number, b: number, ratioMin: number): boolean {
  if (!(a > 0) || !(b > 0)) return false;
  return Math.min(a, b) / Math.max(a, b) >= ratioMin;
}
