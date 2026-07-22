import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { unauthorized } from '../lib/errors';
import { query } from '../db/pool';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw unauthorized('Token ausente.');
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    req.user = verifyAccessToken(token);
  } catch {
    throw unauthorized('Token inválido ou expirado.');
  }

  // Registra o "último acesso" do corretor em QUALQUER atividade autenticada
  // (best-effort, não bloqueia a requisição). O WHERE com throttle de 5 min evita
  // escrever a cada request. Isto reflete o uso real da plataforma — antes só o
  // login por senha atualizava, então o valor congelava perto da data de cadastro.
  if (req.user.role === 'corretor') {
    void query(
      `UPDATE corretor SET ultimo_acesso_em = now()
       WHERE id = $1
         AND (ultimo_acesso_em IS NULL OR ultimo_acesso_em < now() - interval '5 minutes')`,
      [req.user.id],
    ).catch(() => {});
  }

  next();
}
