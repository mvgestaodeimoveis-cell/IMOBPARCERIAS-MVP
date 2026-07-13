import type { Request, Response } from 'express';
import * as authService from './auth.service';
import { unauthorized } from '../../lib/errors';
import { env } from '../../config/env';
import {
  assertGoogleConfigured,
  buildAuthUrl,
  exchangeCodeForProfile,
  isGoogleConfigured,
  signState,
  verifyState,
  type GoogleIntent,
} from '../../lib/google.oauth';
import type {
  ConfirmarEmailInput,
  EsqueciSenhaInput,
  LoginInput,
  RedefinirSenhaInput,
  RefreshInput,
  RegistroInput,
} from './auth.schemas';

export async function registro(req: Request, res: Response) {
  const input = req.body as RegistroInput;
  const result = await authService.iniciarCadastro(input);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const result = await authService.loginCorretor(req.body as LoginInput);
  res.json(result);
}

export async function loginEquipe(req: Request, res: Response) {
  const result = await authService.loginEquipe(req.body as LoginInput);
  res.json(result);
}

export async function refresh(req: Request, res: Response) {
  const { refresh_token } = req.body as RefreshInput;
  const tokens = await authService.refreshTokens(refresh_token);
  res.json(tokens);
}

export async function logout(req: Request, res: Response) {
  const { refresh_token } = req.body as RefreshInput;
  await authService.logout(refresh_token);
  res.status(204).send();
}

export async function esqueciSenha(req: Request, res: Response) {
  const { email } = req.body as EsqueciSenhaInput;
  await authService.solicitarResetSenha(email);
  // Resposta neutra: não revela se o e-mail existe.
  res.status(204).send();
}

export async function redefinirSenha(req: Request, res: Response) {
  const { token, senha } = req.body as RedefinirSenhaInput;
  await authService.redefinirSenha(token, senha);
  res.status(204).send();
}

export async function confirmarEmail(req: Request, res: Response) {
  const { token } = req.body as ConfirmarEmailInput;
  const result = await authService.confirmarEmail(token);
  res.json(result);
}

export async function reenviarConfirmacao(req: Request, res: Response) {
  if (!req.user) throw unauthorized();
  const result = await authService.reenviarConfirmacao(req.user.id);
  res.json(result);
}

// ============================================================
// Login com Google (OAuth 2.0)
// ============================================================

/** Inicia o fluxo: redireciona o navegador para a tela de consentimento do Google. */
export async function googleStart(req: Request, res: Response) {
  if (!isGoogleConfigured()) {
    res.redirect(`${env.APP_WEB_URL}/login?erro=google_indisponivel`);
    return;
  }
  const intent: GoogleIntent = req.query.intent === 'cadastro' ? 'cadastro' : 'login';
  const state = signState(intent);
  res.redirect(buildAuthUrl(state));
}

/** Callback do Google: troca o code, autentica e devolve os tokens ao frontend. */
export async function googleCallback(req: Request, res: Response) {
  const webUrl = env.APP_WEB_URL;
  try {
    if (req.query.error) {
      res.redirect(`${webUrl}/login/google#error=acesso_negado`);
      return;
    }
    assertGoogleConfigured();

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    if (!code || !state) {
      res.redirect(`${webUrl}/login/google#error=requisicao_invalida`);
      return;
    }
    verifyState(state);

    const profile = await exchangeCodeForProfile(code);
    const session = await authService.loginOuCadastrarGoogle(profile);

    const fragment = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      role: 'corretor',
      status: session.corretor.status,
    });
    res.redirect(`${webUrl}/login/google#${fragment.toString()}`);
  } catch {
    res.redirect(`${webUrl}/login/google#error=falha_login`);
  }
}
