import { Router, type Request, type Response } from 'express';

export const telemetryRoutes = Router();

function limpar(valor: unknown, max: number): string | undefined {
  if (typeof valor !== 'string') return undefined;
  // Remove quebras de linha (evita injeção de linhas falsas no log) e trunca.
  const s = valor.replace(/[\r\n]+/g, ' ').trim();
  return s ? s.slice(0, max) : undefined;
}

/**
 * Recebe erros do navegador (front-end) e registra nos logs do servidor.
 * Isso dá visibilidade do que acontece no aparelho do corretor sem depender de
 * ele mandar print. Endpoint público e best-effort (nunca falha o fluxo do usuário).
 */
telemetryRoutes.post('/', (req: Request, res: Response) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const registro = {
    contexto: limpar(b.contexto, 60) ?? 'desconhecido',
    mensagem: limpar(b.mensagem, 500) ?? '(sem mensagem)',
    url: limpar(b.url, 300),
    stack: limpar(b.stack, 2000),
    extra: b.extra && typeof b.extra === 'object' ? b.extra : undefined,
    userAgent: limpar(req.get('user-agent'), 300),
    ip: req.ip,
    em: new Date().toISOString(),
  };
  console.error('[client-error]', JSON.stringify(registro));
  res.status(204).end();
});
