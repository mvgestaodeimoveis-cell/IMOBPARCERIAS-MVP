import { z } from 'zod';

export const listCorretoresQuery = z.object({
  status: z.enum(['verificacao_pendente', 'ativo', 'rejeitado', 'suspenso', 'cadastro_incompleto']).optional(),
  busca: z.string().trim().min(1).max(120).optional(),
  ordem: z.enum(['recentes', 'antigos', 'ultimo_acesso', 'mais_imoveis', 'nome']).default('antigos'),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export const listImoveisQuery = z.object({
  status: z.enum(['ativo', 'em_negociacao', 'vendido', 'inativo']).optional(),
  cidade: z.string().trim().min(1).max(80).optional(),
  busca: z.string().trim().min(1).max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export const rejeitarSchema = z.object({
  motivo: z.string().trim().min(5, 'Informe o motivo da rejeição.').max(500),
});

export const criarAdminSchema = z.object({
  nome: z.string().trim().min(3, 'Informe o nome.').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  senha: z
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres, com letras e números.')
    .regex(/[A-Za-z]/, 'A senha deve conter ao menos uma letra.')
    .regex(/\d/, 'A senha deve conter ao menos um número.'),
});

export const listDenunciasQuery = z.object({
  status: z.enum(['pendente', 'em_analise', 'resolvida']).optional(),
});

export const listParceriasQuery = z.object({
  status: z.enum(['solicitada', 'aceita', 'recusada', 'em_negociacao', 'vendida', 'encerrada', 'cancelada']).optional(),
});

export const listImportLogsQuery = z.object({
  so_falhas: z.enum(['0', '1']).optional(),
});

export const resolverDenunciaSchema = z.object({
  nota: z.string().trim().min(3, 'Descreva como o caso foi tratado.').max(2000),
});

export type ListCorretoresQuery = z.infer<typeof listCorretoresQuery>;
export type ListImoveisQuery = z.infer<typeof listImoveisQuery>;
export type RejeitarInput = z.infer<typeof rejeitarSchema>;
export type CriarAdminInput = z.infer<typeof criarAdminSchema>;
export type ListDenunciasQuery = z.infer<typeof listDenunciasQuery>;
export type ResolverDenunciaInput = z.infer<typeof resolverDenunciaSchema>;
export type ListParceriasQuery = z.infer<typeof listParceriasQuery>;
export type ListImportLogsQuery = z.infer<typeof listImportLogsQuery>;
