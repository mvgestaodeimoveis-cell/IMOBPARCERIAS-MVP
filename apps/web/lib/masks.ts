/** Máscara de telefone BR: (XX) XXXXX-XXXX (celular) ou (XX) XXXX-XXXX (fixo). */
export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Normaliza CRECI: maiúsculas, sem espaços, apenas letras/números/hífen. */
export function maskCreci(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 12);
}

/** Máscara de CEP BR: XXXXX-XXX. */
export function maskCep(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Formata número em Real (R$ 1.234,56). */
export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
