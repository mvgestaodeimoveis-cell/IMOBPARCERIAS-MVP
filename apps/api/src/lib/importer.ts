import { AppError, badRequest } from './errors';

export interface ImovelImportado {
  titulo?: string;
  descricao?: string;
  preco?: number;
  fotos: string[];
  cidade?: string;
  bairro?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  tipo?: 'apartamento' | 'casa' | 'terreno' | 'comercial';
  finalidade?: 'venda' | 'aluguel';
  area_m2?: number;
  quartos?: number;
  banheiros?: number;
  vagas?: number;
  link_origem: string;
}

/** Verdadeiro se o host for um IPv4 pontilhado em faixa privada/local/reservada. */
function ehIpv4PrivadoOuLocal(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    a === 169 ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31) ||
    a >= 224 // multicast/reservado
  );
}

/** Bloqueia URLs internas/privadas (mitigação de SSRF). */
function urlSegura(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw badRequest('Link inválido.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw badRequest('Link inválido.');
  }
  const host = u.hostname.toLowerCase();

  // Nomes locais óbvios.
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost')
  ) {
    throw badRequest('Este link não é permitido.');
  }

  // IPv6 (hostname vem sem colchetes): loopback, não-especificado, link-local (fe80),
  // ULA (fc00::/7 → fc/fd) e IPv4-mapeado.
  if (host.includes(':')) {
    const h = host.replace(/^\[|\]$/g, '');
    if (
      h === '::1' ||
      h === '::' ||
      h.startsWith('fe80') ||
      h.startsWith('fc') ||
      h.startsWith('fd') ||
      h.startsWith('::ffff:')
    ) {
      throw badRequest('Este link não é permitido.');
    }
  }

  // IP em formato numérico não pontilhado (decimal/hex) — ex.: http://2130706433 = 127.0.0.1.
  if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) {
    throw badRequest('Este link não é permitido.');
  }

  if (ehIpv4PrivadoOuLocal(host)) {
    throw badRequest('Este link não é permitido.');
  }

  return u;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .trim();
}

function attr(tag: string, name: string): string | undefined {
  const r = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i');
  const m = r.exec(tag);
  return m ? m[2] ?? m[3] : undefined;
}

function extrairMetas(html: string): Record<string, string[]> {
  const metas: Record<string, string[]> = {};
  const re = /<meta\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const key = (attr(tag, 'property') ?? attr(tag, 'name'))?.toLowerCase();
    const content = attr(tag, 'content');
    if (key && content) {
      (metas[key] ??= []).push(decode(content));
    }
  }
  return metas;
}

function extrairJsonLd(html: string): unknown[] {
  const blocos: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      blocos.push(JSON.parse(m[1].trim()));
    } catch {
      /* ignora JSON quebrado */
    }
  }
  // Achata @graph e arrays.
  const flat: unknown[] = [];
  const visitar = (n: unknown) => {
    if (Array.isArray(n)) n.forEach(visitar);
    else if (n && typeof n === 'object') {
      flat.push(n);
      const graph = (n as { '@graph'?: unknown })['@graph'];
      if (graph) visitar(graph);
    }
  };
  blocos.forEach(visitar);
  return flat;
}

function parsePreco(v: unknown): number | undefined {
  if (typeof v === 'number') return v > 0 ? v : undefined;
  if (typeof v !== 'string') return undefined;
  let s = v.replace(/[^\d.,]/g, '');
  if (!s) return undefined;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/\.\d{3}(?:\.\d{3})*$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function primeiroNumero(re: RegExp, texto: string): number | undefined {
  const m = re.exec(texto);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

function imagensDeJsonLd(image: unknown, acc: string[]): void {
  if (!image) return;
  if (typeof image === 'string') acc.push(image);
  else if (Array.isArray(image)) image.forEach((i) => imagensDeJsonLd(i, acc));
  else if (typeof image === 'object') {
    const url = (image as { url?: unknown; contentUrl?: unknown }).url ?? (image as { contentUrl?: unknown }).contentUrl;
    if (typeof url === 'string') acc.push(url);
  }
}

/** Extração pura a partir do HTML (testável sem rede). */
export function extrairDeHtml(html: string, linkOrigem: string): ImovelImportado {
  const metas = extrairMetas(html);
  const jsonld = extrairJsonLd(html);
  const og = (k: string) => metas[k]?.[0];

  const draft: ImovelImportado = { fotos: [], link_origem: linkOrigem };

  // Título / descrição
  const tituloTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  draft.titulo = og('og:title') ?? (tituloTag ? decode(tituloTag) : undefined);
  draft.descricao = og('og:description') ?? og('description');

  // Preço (meta)
  draft.preco =
    parsePreco(og('product:price:amount')) ??
    parsePreco(og('og:price:amount')) ??
    parsePreco(og('product:price'));

  // Imagens (og:image, pode repetir)
  const fotos: string[] = [];
  (metas['og:image'] ?? []).forEach((u) => fotos.push(u));
  (metas['og:image:secure_url'] ?? []).forEach((u) => fotos.push(u));

  // JSON-LD (schema.org)
  const TIPOS = new Set([
    'product',
    'offer',
    'residence',
    'house',
    'apartment',
    'singlefamilyresidence',
    'realestatelisting',
    'accommodation',
    'place',
  ]);
  for (const node of jsonld) {
    const obj = node as Record<string, unknown>;
    const tipos = ([] as string[]).concat((obj['@type'] as string) ?? []).map((t) => String(t).toLowerCase());
    if (!tipos.some((t) => TIPOS.has(t))) continue;

    if (!draft.titulo && typeof obj.name === 'string') draft.titulo = decode(obj.name);
    if (!draft.descricao && typeof obj.description === 'string') draft.descricao = decode(obj.description);
    imagensDeJsonLd(obj.image, fotos);

    const offers = obj.offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
    const offer = Array.isArray(offers) ? offers[0] : offers;
    if (offer) draft.preco = draft.preco ?? parsePreco(offer.price);

    const address = obj.address as Record<string, unknown> | undefined;
    if (address && typeof address === 'object') {
      draft.logradouro = draft.logradouro ?? (address.streetAddress as string | undefined);
      draft.bairro = draft.bairro ?? (address.addressNeighborhood as string | undefined);
      draft.cidade = draft.cidade ?? (address.addressLocality as string | undefined);
      draft.cep = draft.cep ?? ((address.postalCode as string | undefined)?.replace(/\D/g, '') || undefined);
    }
    const nq = Number(obj.numberOfRooms ?? (obj as Record<string, unknown>).numberOfBedrooms);
    if (!draft.quartos && Number.isFinite(nq) && nq > 0) draft.quartos = nq;
  }

  // Dedup + só http(s), até 20 fotos
  draft.fotos = Array.from(new Set(fotos.filter((u) => /^https?:\/\//i.test(u)))).slice(0, 20);

  // Heurísticas no texto (título + descrição + URL)
  const texto = `${draft.titulo ?? ''} ${draft.descricao ?? ''} ${linkOrigem}`.toLowerCase();
  // Info SEM o link, para números e endereço (evita capturar o id do anúncio da URL).
  const info = `${draft.titulo ?? ''} ${draft.descricao ?? ''}`;
  const infoLower = info.toLowerCase();

  if (/alug|loca(?:ç|c)[aã]o|for rent/.test(texto)) draft.finalidade = 'aluguel';
  else if (/venda|à venda|a venda|comprar|for sale/.test(texto)) draft.finalidade = 'venda';

  if (/\bapartamento\b|\bapto\b|\bflat\b|\bkitnet\b/.test(texto)) draft.tipo = 'apartamento';
  else if (/\bcasa\b|\bsobrado\b|\bcondom[ií]nio\b/.test(texto)) draft.tipo = 'casa';
  else if (/\bterreno\b|\blote\b/.test(texto)) draft.tipo = 'terreno';
  else if (/\bsala\b|\bloja\b|\bcomercial\b|\bgalp[aã]o\b/.test(texto)) draft.tipo = 'comercial';

  draft.preco = draft.preco ?? parsePreco(/r\$\s*([\d.,]+)/i.exec(infoLower)?.[1]);
  draft.area_m2 = draft.area_m2 ?? primeiroNumero(/(\d{2,4})\s*m(?:²|2)/, infoLower);
  draft.quartos = draft.quartos ?? primeiroNumero(/(\d+)\s*(?:quarto|dormit[óo]rio|dorm)/, infoLower);
  draft.banheiros = draft.banheiros ?? primeiroNumero(/(\d+)\s*(?:banheiro|wc|lavabo)/, infoLower);
  draft.vagas = draft.vagas ?? primeiroNumero(/(\d+)\s*(?:vaga|garage)/, infoLower);

  // CEP: exige hífen (5-3) ou rótulo "cep" — evita capturar id do anúncio ou valores.
  if (!draft.cep) {
    const cep = /cep[:\s]*?(\d{5})-?(\d{3})/i.exec(info) ?? /\b(\d{5})-(\d{3})\b/.exec(info);
    if (cep) draft.cep = `${cep[1]}${cep[2]}`;
  }

  // Bairro / cidade a partir do título no padrão "..., Bairro, Cidade - UF".
  if (!draft.bairro || !draft.cidade) {
    const loc = /,\s*([^,]+?),\s*([A-Za-zÀ-ÿ'.\s]+?)\s*-\s*[A-Z]{2}\b/.exec(draft.titulo ?? '');
    if (loc) {
      draft.bairro = draft.bairro ?? loc[1].trim();
      draft.cidade = draft.cidade ?? loc[2].trim();
    }
  }

  return draft;
}

/** Busca a página (com timeout e guarda anti-SSRF) e extrai o rascunho. */
export async function importarDeUrl(url: string): Promise<ImovelImportado> {
  const u = urlSegura(url);
  let res: Response;
  try {
    // Redirecionamentos são seguidos manualmente para revalidar cada destino — sem isso,
    // um link público poderia redirecionar para um host interno (bypass do anti-SSRF).
    let alvo = u;
    let resposta: Response | null = null;
    for (let hop = 0; hop < 4; hop++) {
      const r = await fetch(alvo.toString(), {
        redirect: 'manual',
        signal: AbortSignal.timeout(9000),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; ImobParceriasBot/1.0; +https://imobparcerias.com.br)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      if (r.status >= 300 && r.status < 400) {
        const loc = r.headers.get('location');
        if (!loc) throw badRequest('O site não permitiu a leitura automática. Preencha manualmente.');
        alvo = urlSegura(new URL(loc, alvo).toString());
        continue;
      }
      resposta = r;
      break;
    }
    if (!resposta) throw badRequest('O link tem redirecionamentos em excesso.');
    res = resposta;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw badRequest('Não foi possível acessar o link. Verifique o endereço.');
  }
  if (!res.ok) {
    throw badRequest('O site não permitiu a leitura automática. Preencha manualmente.');
  }
  const html = (await res.text()).slice(0, 3_000_000);
  return extrairDeHtml(html, res.url || u.toString());
}
