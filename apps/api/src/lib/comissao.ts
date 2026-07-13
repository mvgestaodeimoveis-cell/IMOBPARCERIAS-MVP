/** Cálculo da comissão e da taxa da plataforma (Seção 7.1 do escopo). */
export const COMISSAO_PCT = 0.05; // 5% do valor do imóvel (Bahia)
export const TAXA_PCT = 0.1; // 10% da comissão do captador

function arredondar(v: number): number {
  return Math.round(v * 100) / 100;
}

export function calcularComissaoTaxa(valor: number): { comissao: number; taxa: number } {
  const comissao = arredondar(valor * COMISSAO_PCT);
  const taxa = arredondar(comissao * TAXA_PCT);
  return { comissao, taxa };
}
