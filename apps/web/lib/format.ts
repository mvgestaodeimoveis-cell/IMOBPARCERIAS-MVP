/** Helpers de formatação/exibição reutilizáveis. */

/** Iniciais de um nome (até 2 letras, maiúsculas). Ex.: "Maria Silva" → "MS". */
export function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase();
}

/** Tempo relativo curto a partir de um ISO: agora / 5min / 3h / 2d / dd/mm. */
export function tempoRelativo(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const dias = Math.floor(h / 24);
  if (dias < 7) return `${dias}d`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Link do WhatsApp a partir de um número (ou null se vazio). */
export function waLink(whatsapp: string | null): string | null {
  if (!whatsapp) return null;
  return `https://wa.me/${whatsapp.replace(/\D/g, '')}`;
}
