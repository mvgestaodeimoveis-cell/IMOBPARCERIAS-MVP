import type { NextFunction, Request, Response } from 'express';

/**
 * Log de acesso simples: uma linha por requisição com método, rota, status e duração.
 * Facilita achar erros (4xx/5xx) e lentidão nos logs do Render.
 * Ignora o health check para não poluir o log.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health') return next();
  const inicio = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    const linha = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(0)}ms`;
    if (res.statusCode >= 500) console.error('[http]', linha);
    else if (res.statusCode >= 400) console.warn('[http]', linha);
    else console.log('[http]', linha);
  });
  next();
}
