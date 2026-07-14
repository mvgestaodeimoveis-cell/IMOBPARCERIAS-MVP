// Codifica/decodifica a lista de imóveis de uma seleção para o cliente num token
// curto para a URL pública /ver/[token]. Não expõe nada sensível — são só IDs
// de imóveis que já são públicos na vitrine.

function toBase64Url(s: string): string {
  const b64 = typeof window === 'undefined' ? Buffer.from(s).toString('base64') : btoa(s);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return typeof window === 'undefined' ? Buffer.from(b64, 'base64').toString() : atob(b64);
}

export function encodeSelecao(ids: string[]): string {
  return toBase64Url(ids.join(','));
}

export function decodeSelecao(token: string): string[] {
  try {
    return fromBase64Url(token)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
