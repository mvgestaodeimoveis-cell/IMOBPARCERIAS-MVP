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
