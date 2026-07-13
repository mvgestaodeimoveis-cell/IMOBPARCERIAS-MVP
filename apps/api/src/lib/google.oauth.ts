import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { badRequest, forbidden } from './errors';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';

const STATE_PURPOSE = 'google_oauth_state';

export type GoogleIntent = 'login' | 'cadastro';

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerificado: boolean;
  nome: string;
}

/** Verdadeiro apenas quando as três credenciais do Google estão configuradas. */
export function isGoogleConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);
}

/** Garante que o fluxo só siga quando configurado; caso contrário, erro claro. */
export function assertGoogleConfigured(): void {
  if (!isGoogleConfigured()) {
    throw forbidden('Login com Google não está habilitado neste ambiente.');
  }
}

/** State assinado (curta duração) para proteção CSRF — não depende de cookie. */
export function signState(intent: GoogleIntent): string {
  return jwt.sign({ purpose: STATE_PURPOSE, intent }, env.JWT_SECRET, { expiresIn: '10m' });
}

export function verifyState(state: string): GoogleIntent {
  try {
    const decoded = jwt.verify(state, env.JWT_SECRET) as { purpose?: string; intent?: GoogleIntent };
    if (decoded.purpose !== STATE_PURPOSE) throw new Error('purpose inválido');
    return decoded.intent === 'cadastro' ? 'cadastro' : 'login';
  } catch {
    throw badRequest('Sessão de login com Google inválida ou expirada.');
  }
}

/** URL da tela de consentimento do Google. */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID as string,
    redirect_uri: env.GOOGLE_REDIRECT_URI as string,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    include_granted_scopes: 'true',
    prompt: 'select_account',
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/** Troca o `code` por tokens e retorna o perfil básico do usuário. */
export async function exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID as string,
      client_secret: env.GOOGLE_CLIENT_SECRET as string,
      redirect_uri: env.GOOGLE_REDIRECT_URI as string,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    throw badRequest('Falha ao autenticar com o Google.');
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    throw badRequest('Falha ao autenticar com o Google.');
  }

  const userRes = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userRes.ok) {
    throw badRequest('Não foi possível obter seus dados do Google.');
  }

  const user = (await userRes.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
  };

  if (!user.sub || !user.email) {
    throw badRequest('Conta Google sem e-mail disponível.');
  }

  return {
    sub: user.sub,
    email: user.email.trim().toLowerCase(),
    emailVerificado: Boolean(user.email_verified),
    nome: (user.name || user.given_name || user.email.split('@')[0]).trim(),
  };
}
