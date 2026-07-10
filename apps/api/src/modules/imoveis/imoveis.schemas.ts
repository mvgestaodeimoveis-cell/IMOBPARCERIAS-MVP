import { z } from 'zod';

const cepSchema = z.string().transform((v, ctx) => {
  const digits = v.replace(/\D/g, '');
  if (digits.length !== 8) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CEP inválido.' });
    return z.NEVER;
  }
  return digits;
});

const inteiroOpcional = z.number().int().min(0).max(200).nullish();

const opcional = (max = 80) =>
  z.string().trim().max(max).optional().transform((v) => v || null);

const imovelBase = z.object({
  finalidade: z.enum(['venda', 'aluguel'], {
    errorMap: () => ({ message: 'Selecione a finalidade.' }),
  }),
  tipo: z.enum(['apartamento', 'casa', 'terreno', 'comercial'], {
    errorMap: () => ({ message: 'Selecione o tipo do imóvel.' }),
  }),
  preco: z.number({ invalid_type_error: 'Informe um preço válido.' }).positive('Informe um preço válido.').max(1_000_000_000),
  cidade: z.string().trim().min(2, 'Informe a cidade.').max(80),
  bairro: z.string().trim().min(2, 'Informe o bairro.').max(80),
  cep: cepSchema,
  logradouro: z.string().trim().min(2, 'Informe o logradouro.').max(160),
  numero: z.string().trim().min(1, 'Informe o número.').max(20),
  complemento: opcional(80),
  unidade: opcional(20),
  andar: opcional(20),
  bloco: opcional(40),
  nome_condominio: opcional(120),
  area_m2: z.number().positive().max(1_000_000).nullish(),
  quartos: inteiroOpcional,
  suites: inteiroOpcional,
  banheiros: inteiroOpcional,
  vagas: inteiroOpcional,
  descricao: z.string().trim().max(4000).optional().transform((v) => v || null),
  diferenciais: z.array(z.string().trim().min(1).max(60)).max(20).optional().default([]),
  documentacao: z.array(z.string().trim().min(1).max(60)).max(15).optional().default([]),
  fotos: z.array(z.string().url()).max(20).optional().default([]),
  link_origem: z.string().url().max(500).optional(),
  // Exclusividade (Fase 2/7.5): contrato assinado com o proprietário + vencimento.
  exclusividade: z.boolean().optional().default(false),
  exclusividade_contrato_url: z.string().url().max(500).optional(),
  exclusividade_vencimento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')
    .optional(),
  // Confirmação manual em caso de DUPLICATA POSSÍVEL (mesmo prédio, unidade distinta).
  confirmar_distinto: z.boolean().optional().default(false),
});

// Campos obrigatórios da chave por tipo (Seção 5): apto/comercial exigem unidade.
export const criarImovelSchema = imovelBase.superRefine((v, ctx) => {
  if ((v.tipo === 'apartamento' || v.tipo === 'comercial') && !v.unidade) {
    ctx.addIssue({
      path: ['unidade'],
      code: z.ZodIssueCode.custom,
      message: v.tipo === 'apartamento' ? 'Informe a unidade/apto.' : 'Informe a sala/unidade.',
    });
  }
  if (v.tipo === 'apartamento' && !v.andar) {
    ctx.addIssue({ path: ['andar'], code: z.ZodIssueCode.custom, message: 'Informe o andar.' });
  }
  if (v.tipo === 'terreno' && !v.area_m2) {
    ctx.addIssue({ path: ['area_m2'], code: z.ZodIssueCode.custom, message: 'Informe a metragem.' });
  }
  if ((v.documentacao?.length ?? 0) === 0) {
    ctx.addIssue({
      path: ['documentacao'],
      code: z.ZodIssueCode.custom,
      message: 'Selecione ao menos um documento disponível.',
    });
  }
  if (v.exclusividade) {
    if (!v.exclusividade_contrato_url) {
      ctx.addIssue({
        path: ['exclusividade_contrato_url'],
        code: z.ZodIssueCode.custom,
        message: 'Envie o contrato de exclusividade.',
      });
    }
    if (!v.exclusividade_vencimento) {
      ctx.addIssue({
        path: ['exclusividade_vencimento'],
        code: z.ZodIssueCode.custom,
        message: 'Informe a data de vencimento.',
      });
    }
  }
});

export const importarImovelSchema = z.object({
  url: z.string().url('Informe um link válido.').max(500),
});

export const vitrineQuerySchema = z.object({
  tipo: z.enum(['apartamento', 'casa', 'terreno', 'comercial']).optional(),
  finalidade: z.enum(['venda', 'aluguel']).optional(),
  cidade: z.string().trim().min(1).max(80).optional(),
  bairro: z.string().trim().min(1).max(80).optional(),
  preco_min: z.coerce.number().min(0).optional(),
  preco_max: z.coerce.number().min(0).optional(),
  area_min: z.coerce.number().min(0).optional(),
  quartos_min: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(48).default(12),
});

export const atualizarImovelSchema = imovelBase.partial().extend({
  status: z.enum(['ativo', 'em_negociacao', 'inativo', 'vendido']).optional(),
});

export type CriarImovelInput = z.infer<typeof criarImovelSchema>;
export type AtualizarImovelInput = z.infer<typeof atualizarImovelSchema>;
export type ImportarImovelInput = z.infer<typeof importarImovelSchema>;
export type VitrineQuery = z.infer<typeof vitrineQuerySchema>;
