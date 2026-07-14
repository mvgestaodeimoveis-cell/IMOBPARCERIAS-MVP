// Codifica/decodifica uma seleção de imóveis para o cliente num token da URL
// pública /ver/[token]. Inclui, opcionalmente, o WhatsApp e o nome do corretor
// para o cliente conseguir responder "gostei deste" direto pra ele.
// São dados que o corretor já compartilha ao enviar o link — nada de terceiros.

export interface SelecaoData {
  ids: string[];
  whatsapp?: string;
  corretor?: string;
}

function toBase64Url(s: string): string {
  const b64 =
    typeof window === 'undefined'
      ? Buffer.from(s, 'utf8').toString('base64')
      : btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return typeof window === 'undefined'
    ? Buffer.from(b64, 'base64').toString('utf8')
    : decodeURIComponent(escape(atob(b64)));
}

export function encodeSelecao(ids: string[], opts?: { whatsapp?: string; corretor?: string }): string {
  const payload = { i: ids, w: opts?.whatsapp || undefined, n: opts?.corretor || undefined };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeSelecao(token: string): SelecaoData {
  try {
    const o = JSON.parse(fromBase64Url(token));
    if (o && Array.isArray(o.i)) {
      return { ids: o.i.filter(Boolean), whatsapp: o.w || undefined, corretor: o.n || undefined };
    }
  } catch {
    /* tenta o formato antigo (ids separados por vírgula) */
  }
  try {
    return { ids: fromBase64Url(token).split(',').map((s) => s.trim()).filter(Boolean) };
  } catch {
    return { ids: [] };
  }
}
