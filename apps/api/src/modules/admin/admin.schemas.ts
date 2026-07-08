import { z } from 'zod';

export const listCorretoresQuery = z.object({
  status: z.enum(['verificacao_pendente', 'ativo', 'rejeitado', 'suspenso']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export const rejeitarSchema = z.object({
  motivo: z.string().trim().min(5, 'Informe o motivo da rejeição.').max(500),
});

export type ListCorretoresQuery = z.infer<typeof listCorretoresQuery>;
export type RejeitarInput = z.infer<typeof rejeitarSchema>;
