import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  APP_WEB_URL: z.string().default('http://localhost:3000'),
  TERMO_VERSAO: z.string().default('2026-07-01'),
  RESET_TOKEN_EXPIRES_IN: z.string().default('1h'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Imob Parcerias <no-reply@imobparcerias.com.br>'),
  EQUIPE_NOTIFICACAO_EMAIL: z.string().optional(),
  // Chave PIX para cobrança da taxa da plataforma (Fase 8). Sem ela, o e-mail
  // orienta o captador a aguardar a chave enviada pela equipe.
  PIX_CHAVE: z.string().optional(),
  // Double opt-in (B4): quando 'true', exige e-mail confirmado para concluir o cadastro.
  EXIGIR_EMAIL_VERIFICADO: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  INATIVIDADE_DIAS: z.coerce.number().int().positive().default(60),
  // Cooldown (horas) do e-mail de "nova mensagem" por conversa/destinatário — evita spam.
  MENSAGEM_EMAIL_COOLDOWN_HORAS: z.coerce.number().min(0).default(2),
  // Login com Google (OAuth 2.0) — opcional. Sem as três, o fluxo fica desativado.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  // Notificações por WhatsApp — opcional. Sem as duas, cai no log (desativado).
  WHATSAPP_API_URL: z.string().url().optional(),
  WHATSAPP_API_TOKEN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
