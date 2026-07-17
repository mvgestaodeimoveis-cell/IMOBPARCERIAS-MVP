/**
 * Extrai campos estruturados de um texto livre (ex.: mensagem de WhatsApp) sobre um imóvel
 * ou sobre o que um cliente procura. Best-effort — sempre exige revisão humana, como a
 * importação por link (Seção 2.5 do escopo). Nunca lança: retorna só o que reconheceu.
 */

export interface ImovelExtraido {
  finalidade?: 'venda' | 'aluguel';
  tipo?: 'apartamento' | 'casa' | 'terreno' | 'comercial';
  preco?: number;
  area_m2?: number;
  quartos?: number;
  suites?: number;
  banheiros?: number;
  vagas?: number;
  cidade?: string;
  bairro?: string;
  diferenciais: string[];
  descricao?: string;
  /** Nomes amigáveis dos campos reconhecidos (para feedback ao usuário). */
  reconhecidos: string[];
}

const CIDADES = [
  'Salvador',
  'Lauro de Freitas',
  'Camaçari',
  'Mata de São João',
  "Dias d'Ávila",
  'Simões Filho',
];

/** Diferencial canônico → termos que o disparam no texto. */
const DIFERENCIAIS: Record<string, string[]> = {
  Piscina: ['piscina'],
  Academia: ['academia', 'fitness', 'espaco fitness'],
  Varanda: ['varanda', 'sacada', 'gourmet'],
  Churrasqueira: ['churrasqueira', 'churrasco'],
  'Portaria 24h': ['portaria 24', 'portaria24', '24 horas', '24h', 'porteiro'],
  Elevador: ['elevador'],
  Mobiliado: ['mobiliado', 'mobiliada', 'semimobiliado', 'semi mobiliado'],
  'Área de lazer': ['area de lazer', 'lazer completo', 'espaco de lazer'],
  'Pet friendly': ['pet friendly', 'aceita pet', 'pet '],
  'Ar-condicionado': ['ar condicionado', 'ar-condicionado', 'split', 'climatizado'],
  'Salão de festas': ['salao de festas', 'salao de festa', 'espaco festa'],
  'Vista livre': ['vista livre', 'vista mar', 'vista para o mar', 'vista panoramica', 'nascente'],
};

/** Remove acentos e baixa a caixa para facilitar as buscas. */
function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Converte um número no formato BR ("450.000,00" / "1,2") em Number. */
function numeroBR(raw: string): number | null {
  let s = raw.trim().replace(/\s/g, '');
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Reconhece preço em "1,2 milhão", "450 mil", "450k", "R$ 450.000" ou "valor 450000". */
function extrairPreco(t: string): number | undefined {
  let m = t.match(/r?\$?\s*(\d[\d.,]*)\s*(?:milh[õo]es?|milhao|\bmi\b|kk)/i);
  if (m) {
    const n = numeroBR(m[1]);
    if (n != null && n > 0) return Math.round(n * 1_000_000);
  }
  m = t.match(/r?\$?\s*(\d[\d.,]*)\s*(?:mil\b|\bk\b)/i);
  if (m) {
    const n = numeroBR(m[1]);
    if (n != null && n > 0) return Math.round(n * 1_000);
  }
  m = t.match(/r\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d{4,}(?:,\d{2})?)/i);
  if (m) {
    const n = numeroBR(m[1]);
    if (n != null && n >= 1_000) return Math.round(n);
  }
  m = t.match(/(?:valor|pre[çc]o|por|pedem?)\D{0,8}(\d{1,3}(?:\.\d{3})+|\d{5,})/i);
  if (m) {
    const n = numeroBR(m[1]);
    if (n != null && n >= 1_000) return Math.round(n);
  }
  return undefined;
}

/** Primeiro número inteiro que casa com o regex (ou undefined). */
function extrairInteiro(t: string, re: RegExp): number | undefined {
  const m = t.match(re);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : undefined;
}

export function parseImovelTexto(textoOriginal: string): ImovelExtraido {
  const texto = (textoOriginal ?? '').slice(0, 5000);
  const t = normalizar(texto);
  const reconhecidos: string[] = [];
  const out: ImovelExtraido = { diferenciais: [], reconhecidos };

  // Finalidade
  if (/\balug|loca[çc]|para alugar|pra alugar/.test(t)) {
    out.finalidade = 'aluguel';
    reconhecidos.push('finalidade');
  } else if (/\bvenda|\bvende|a venda|à venda|comprar|compra|vendo/.test(t)) {
    out.finalidade = 'venda';
    reconhecidos.push('finalidade');
  }

  // Tipo
  if (/apartamento|\bapto?\b|\bap\b|ap[êe]|kitnet|kitinete|studio|st[úu]dio|\bflat\b/.test(t)) {
    out.tipo = 'apartamento';
  } else if (/\bcasa\b|sobrado|duplex|triplex|t[ée]rrea/.test(t)) {
    out.tipo = 'casa';
  } else if (/terreno|\blote\b/.test(t)) {
    out.tipo = 'terreno';
  } else if (/comercial|\bsala\b|\bloja\b|galp[ãa]o|escrit[óo]rio|ponto comercial/.test(t)) {
    out.tipo = 'comercial';
  }
  if (out.tipo) reconhecidos.push('tipo');

  // Preço
  const preco = extrairPreco(t);
  if (preco) {
    out.preco = preco;
    reconhecidos.push('preço');
  }

  // Área (m²)
  const areaM = t.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|m2|metros? quadrados?|metros?\b)/i);
  if (areaM) {
    const n = numeroBR(areaM[1]);
    if (n != null && n > 0 && n < 100_000) {
      out.area_m2 = n;
      reconhecidos.push('metragem');
    }
  }

  // Quartos — inclui o formato baiano "2/4" (2 quartos) e "dormitórios".
  out.quartos =
    extrairInteiro(t, /(\d+)\s*\/\s*4\b/) ??
    extrairInteiro(t, /(\d+)\s*(?:quartos?|qtos?|dorm(?:it[óo]rios?)?)/);
  if (out.quartos != null) reconhecidos.push('quartos');

  out.suites = extrairInteiro(t, /(\d+)\s*su[ií]tes?/);
  if (out.suites != null) reconhecidos.push('suítes');

  out.banheiros = extrairInteiro(t, /(\d+)\s*(?:banheiros?|\bwc\b|lavabos?)/);
  if (out.banheiros != null) reconhecidos.push('banheiros');

  out.vagas =
    extrairInteiro(t, /(\d+)\s*(?:vagas?|garagens?)/) ??
    extrairInteiro(t, /garagem\s*(?:para|p\/)?\s*(\d+)/);
  if (out.vagas != null) reconhecidos.push('vagas');

  // Cidade (lista fixa da região)
  for (const cidade of CIDADES) {
    if (t.includes(normalizar(cidade))) {
      out.cidade = cidade;
      reconhecidos.push('cidade');
      break;
    }
  }

  // Bairro — tenta, em ordem: rótulo explícito ("bairro: X"), título com barra
  // ("Residencial | Abrantes") e "no/na X" (ignorando nomes de via como Estrada/Rua/Av).
  const VIAS = /^(estrada|rua|r\.|av|avenida|alameda|al\.|travessa|tv\.|rodovia|rod\.|loteamento|condom[íi]nio|cond\.|residencial|vila|edif[íi]cio|ed\.)\b/i;
  const limparBairro = (raw: string) =>
    raw
      .trim()
      .replace(/\s+(no|na|em|de|com|por|antes|pr[óo]xim[oa])\b.*$/i, '')
      .trim();

  let bairro: string | undefined;
  let bm = texto.match(/bairro\s*:?\s*([A-Za-zÀ-ú][A-Za-zÀ-ú' ]{2,28})/);
  if (bm) bairro = limparBairro(bm[1]);
  if (!bairro) {
    // Título com separador em barra ou travessão: "Vila Florença Residencial | Abrantes".
    bm = texto.match(/[|\u2013\u2014]\s*([A-ZÀ-Ú][A-Za-zÀ-ú' ]{2,28})/);
    if (bm) bairro = limparBairro(bm[1]);
  }
  if (!bairro) {
    bm = texto.match(/\b(?:no|na)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s[A-ZÀ-Ú][a-zà-ú]+){0,2})/);
    if (bm && !VIAS.test(bm[1])) bairro = limparBairro(bm[1]);
  }
  if (bairro && bairro.length >= 3 && !VIAS.test(bairro) && !CIDADES.some((c) => normalizar(c) === normalizar(bairro!))) {
    out.bairro = bairro;
    reconhecidos.push('bairro');
  }

  // Diferenciais
  for (const [canonico, termos] of Object.entries(DIFERENCIAIS)) {
    if (termos.some((termo) => t.includes(termo))) {
      out.diferenciais.push(canonico);
    }
  }
  if (out.diferenciais.length > 0) reconhecidos.push('diferenciais');

  const descricao = texto.trim();
  if (descricao) out.descricao = descricao;

  return out;
}
