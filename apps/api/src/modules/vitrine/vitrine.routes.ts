import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { badRequest } from '../../lib/errors';
import { vitrineQuerySchema } from '../imoveis/imoveis.schemas';
import { listarVitrine, obterVitrine } from '../imoveis/imoveis.service';

// Vitrine pública (Nível 1) — navegável sem login (Fase 4 do escopo).
export const vitrineRoutes = Router();

vitrineRoutes.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = vitrineQuerySchema.safeParse(req.query);
    if (!parsed.success) throw badRequest('Filtros inválidos.');
    const result = await listarVitrine(parsed.data);
    res.json(result);
  }),
);

vitrineRoutes.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const imovel = await obterVitrine(req.params.id);
    res.json(imovel);
  }),
);
