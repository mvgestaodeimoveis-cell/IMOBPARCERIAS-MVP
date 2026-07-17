import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { env } from '../../config/env';
import { forbidden } from '../../lib/errors';
import { executarManutencaoImoveis, alertarExclusividadeVencendo } from '../imoveis/imoveis.service';
import { suspenderInadimplentes, solicitarFeedbackVisitas } from '../parcerias/parcerias.service';

export const jobsRoutes = Router();

/** Autoriza chamadas de cron externo via segredo compartilhado. */
function autorizarCron(req: Request) {
  const secret = env.CRON_SECRET;
  const enviado = req.header('x-cron-secret');
  if (!secret || !enviado || enviado !== secret) {
    throw forbidden('Job não autorizado.');
  }
}

// Manutenção dos imóveis (Fase 3): 1º aviso (30d) → 2º aviso (+7d) → INATIVO (+5d). Rodar diário.
jobsRoutes.post(
  '/imoveis-inativos',
  asyncHandler(async (req: Request, res: Response) => {
    autorizarCron(req);
    const resultado = await executarManutencaoImoveis();
    res.json(resultado);
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

// Item 3 — e-mail de feedback pós-visita (algumas horas após a data agendada). Rodar diário.
jobsRoutes.post(
  '/feedback-visitas',
  asyncHandler(async (req: Request, res: Response) => {
    autorizarCron(req);
    const solicitados = await solicitarFeedbackVisitas();
    res.json({ solicitados });
  }),
);
