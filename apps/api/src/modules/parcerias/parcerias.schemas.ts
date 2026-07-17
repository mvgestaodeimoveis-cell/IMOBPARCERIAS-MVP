import { z } from 'zod';

export const solicitarParceriaSchema = z.object({
  imovel_id: z.string().uuid('Imóvel inválido.'),
  cliente_nome: z.string().trim().min(3, 'Informe o nome do cliente.').max(120),
  perfil_confirmado: z.literal(true, {
    errorMap: () => ({ message: 'Confirme que o cliente tem interesse real em visitar.' }),
  }),
});

export const recusarParceriaSchema = z.object({
  motivo: z.string().trim().max(500).optional(),
});

export const mensagemSchema = z.object({
  corpo: z.string().trim().min(1, 'Escreva uma mensagem.').max(2000),
});

export const visitaSchema = z.object({
  visita_em: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2})?$/, 'Informe uma data válida.'),
});

/** Valida CPF (11 dígitos + dígitos verificadores). */
function cpfValido(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = calc(cpf.slice(0, 9), 10);
  const d2 = calc(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

export const cpfSchema = z.object({
  cpf: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine(cpfValido, 'CPF inválido.'),
});

export const vendaSchema = z.object({
  valor: z
    .number({ invalid_type_error: 'Informe o valor da venda.' })
    .positive('Informe o valor da venda.')
    .max(1_000_000_000),
});

export const avaliacaoSchema = z.object({
  nota: z.number().int().min(1, 'Nota de 1 a 5.').max(5, 'Nota de 1 a 5.'),
  comentario: z.string().trim().max(1000).optional(),
});

export const feedbackVisitaSchema = z.object({
  resultado: z.enum(['proposta', 'interesse_sem_proposta', 'sem_interesse', 'revisitar', 'outros'], {
    errorMap: () => ({ message: 'Selecione o resultado da visita.' }),
  }),
  observacao: z.string().trim().max(1000).optional(),
  // Decisão do captador: manter o imóvel em negociação (true) ou liberá-lo p/ a vitrine (false).
  manter_status: z.boolean().optional(),
});

export type SolicitarParceriaInput = z.infer<typeof solicitarParceriaSchema>;
export type RecusarParceriaInput = z.infer<typeof recusarParceriaSchema>;
export type MensagemInput = z.infer<typeof mensagemSchema>;
export type VisitaInput = z.infer<typeof visitaSchema>;
export type CpfInput = z.infer<typeof cpfSchema>;
export type VendaInput = z.infer<typeof vendaSchema>;
export type AvaliacaoInput = z.infer<typeof avaliacaoSchema>;
export type FeedbackVisitaInput = z.infer<typeof feedbackVisitaSchema>;
