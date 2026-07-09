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

export const criarImovelSchema = z.object({
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
  complemento: z.string().trim().max(80).optional().transform((v) => v || null),
  area_m2: z.number().positive().max(1_000_000).nullish(),
  quartos: inteiroOpcional,
  suites: inteiroOpcional,
  banheiros: inteiroOpcional,
  vagas: inteiroOpcional,
  descricao: z.string().trim().max(4000).optional().transform((v) => v || null),
  fotos: z.array(z.string().url()).max(20).optional().default([]),
});

export const atualizarImovelSchema = criarImovelSchema.partial().extend({
  status: z.enum(['ativo', 'inativo', 'vendido']).optional(),
});

export type CriarImovelInput = z.infer<typeof criarImovelSchema>;
export type AtualizarImovelInput = z.infer<typeof atualizarImovelSchema>;
