import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { env } from '../../config/env';
import { forbidden } from '../../lib/errors';
import { marcarImoveisInativos } from '../imoveis/imoveis.service';

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
