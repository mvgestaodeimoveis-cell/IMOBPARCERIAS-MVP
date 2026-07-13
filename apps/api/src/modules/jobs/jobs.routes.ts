import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { env } from '../../config/env';
import { forbidden } from '../../lib/errors';
import { marcarImoveisInativos, alertarExclusividadeVencendo } from '../imoveis/imoveis.service';
import { suspenderInadimplentes } from '../parcerias/parcerias.service';

export const jobsRoutes = Router();

/** Autoriza chamadas de cron externo via segredo compartilhado. */
function autorizarCron(req: Request) {
  const secret = env.CRON_SECRET;
  const enviado = req.header('x-cron-secret');
  if (!secret || !enviado || enviado !== secret) {
    throw forbidden('Job não autorizado.');
  }
}

// Marca como INATIVO os imóveis DISPONÍVEIS sem atualização há N dias.
jobsRoutes.post(
  '/imoveis-inativos',
  asyncHandler(async (req: Request, res: Response) => {
    autorizarCron(req);
    const dias = env.INATIVIDADE_DIAS;
    const inativados = await marcarImoveisInativos(dias);
    res.json({ inativados, dias });
  }),
);

// Suspende captadores com pagamento de taxa vencido (Fase 8 — inadimplência).
jobsRoutes.post(
  '/pagamentos-vencidos',
  asyncHandler(async (req: Request, res: Response) => {
    autorizarCron(req);
    const suspensos = await suspenderInadimplentes();
    res.json({ suspensos });
  }),
);

// Alerta de vencimento de exclusividade (15 dias antes).
jobsRoutes.post(
  '/exclusividade-vencendo',
  asyncHandler(async (req: Request, res: Response) => {
    autorizarCron(req);
    const alertas = await alertarExclusividadeVencendo();
    res.json({ alertas });
  }),
);
