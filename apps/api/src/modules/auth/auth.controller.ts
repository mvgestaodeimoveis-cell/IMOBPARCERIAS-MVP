import type { Request, Response } from 'express';
import * as authService from './auth.service';
import type {
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
