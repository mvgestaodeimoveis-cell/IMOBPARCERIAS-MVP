import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { badRequest, notFound, unauthorized } from '../../lib/errors';
import { criarSelecao, obterSelecao } from './selecoes.service';

export const selecoesRoutes = Router();

// Criar link curto — exige corretor logado.
selecoesRoutes.post(
  '/',
  authenticate,
  authorize('corretor'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const body = req.body as { ids?: unknown };
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((x): x is string => typeof x === 'string')
      : [];
    if (ids.length === 0) throw badRequest('Selecione ao menos um imóvel.');
    const result = await criarSelecao(req.user.id, ids);
    res.status(201).json(result);
  }),
);

// Leitura pública pelo cliente (sem login).
selecoesRoutes.get(
  '/:codigo',
  asyncHandler(async (req: Request, res: Response) => {
    const selecao = await obterSelecao(req.params.codigo);
    if (!selecao) throw notFound('Seleção não encontrada.');
    res.json(selecao);
  }),
);
