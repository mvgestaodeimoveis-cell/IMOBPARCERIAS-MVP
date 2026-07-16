/**
 * Rótulos de exibição centralizados (pt-BR).
 * Cada domínio tem seu próprio mapa de status — não misturar.
 */

/** Tipos de imóvel. */
export const TIPO_LABEL: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  terreno: 'Terreno',
  comercial: 'Comercial',
};

/** Status de um imóvel na carteira/vitrine. */
export const IMOVEL_STATUS_LABEL: Record<string, string> = {
  ativo: 'Disponível',
  em_negociacao: 'Em negociação',
  vendido: 'Vendido',
  inativo: 'Inativo',
};

/**
 * Rótulo do status considerando a finalidade: para aluguel, "vendido" vira "Alugado".
 * (Internamente o status continua sendo 'vendido' = negócio concluído.)
 */
export function statusImovelLabel(status: string, finalidade?: string): string {
  if (status === 'vendido' && finalidade === 'aluguel') return 'Alugado';
  return IMOVEL_STATUS_LABEL[status] ?? status;
}

/** Texto do botão de concluir o negócio, conforme a finalidade. */
export function marcarConcluidoLabel(finalidade?: string): string {
  return finalidade === 'aluguel' ? 'Marcar alugado' : 'Marcar vendido';
}

/** Status de uma parceria (fluxo completo). */
export const PARCERIA_STATUS_LABEL: Record<string, string> = {
  solicitada: 'Solicitada',
  aceita: 'Aceita',
  recusada: 'Recusada',
  em_negociacao: 'Em negociação',
  vendida: 'Vendida',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
};

/** Status de uma conversa (visão do inbox de negociações ativas). */
export const CONVERSA_STATUS_LABEL: Record<string, string> = {
  aceita: 'Aberta',
  em_negociacao: 'Em negociação',
  vendida: 'Vendida',
  encerrada: 'Encerrada',
};

/** Status de um corretor (moderação da equipe). */
export const CORRETOR_STATUS_LABEL: Record<string, string> = {
  verificacao_pendente: 'Pendente',
  ativo: 'Ativo',
  rejeitado: 'Rejeitado',
  suspenso: 'Suspenso',
  cadastro_incompleto: 'Incompleto',
};
