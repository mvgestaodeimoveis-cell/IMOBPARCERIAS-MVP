import { z } from 'zod';

/** Normaliza WhatsApp BR para E.164 (+55DDDNNNNNNNN[N]). */
function normalizeWhatsapp(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  // 55 + DDD (2) + número (8 ou 9) => 12 ou 13 dígitos
  if (withCountry.length < 12 || withCountry.length > 13) return null;
  return `+${withCountry}`;
}

const whatsappSchema = z
  .string()
  .transform((v, ctx) => {
    const normalized = normalizeWhatsapp(v);
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe um WhatsApp válido com DDD.' });
      return z.NEVER;
    }
    return normalized;
  });

const senhaSchema = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres, com letras e números.')
  .regex(/[A-Za-z]/, 'A senha deve conter ao menos uma letra.')
  .regex(/\d/, 'A senha deve conter ao menos um número.');

const creciSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, ''))
  .pipe(z.string().min(4, 'CRECI inválido.').max(20, 'CRECI inválido.'));

// Etapa 1 — captura do lead (persistido imediatamente)
export const registroSchema = z.object({
  nome: z.string().trim().min(3, 'Informe seu nome completo.').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  senha: senhaSchema,
});

// Etapa 2 — completa o cadastro do corretor
export const completarCadastroSchema = z.object({
  whatsapp: whatsappSchema,
  cidade: z.string().trim().min(2, 'Informe sua cidade.').max(80),
  creci: creciSchema,
  imobiliaria: z
    .string()
    .trim()
    .max(120, 'Nome da imobiliária muito longo.')
    .optional()
    .transform((v) => (v ? v : null)),
  aceite_termo: z.literal(true, {
    errorMap: () => ({ message: 'É necessário aceitar o Termo de Uso.' }),
  }),
  versao_termo: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  senha: z.string().min(1, 'Informe a senha.'),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'refresh_token é obrigatório.'),
});

export const esqueciSenhaSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
});

export const redefinirSenhaSchema = z.object({
  token: z.string().min(1, 'Token inválido.'),
  senha: senhaSchema,
});

export type RegistroInput = z.infer<typeof registroSchema>;
export type CompletarCadastroInput = z.infer<typeof completarCadastroSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type EsqueciSenhaInput = z.infer<typeof esqueciSenhaSchema>;
export type RedefinirSenhaInput = z.infer<typeof redefinirSenhaSchema>;
