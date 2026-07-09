import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { unauthorized } from '../../lib/errors';
import { listCorretoresQuery, rejeitarSchema, type ListCorretoresQuery, type RejeitarInput } from './admin.schemas';
import * as adminService from './admin.service';

export const adminRoutes = Router();

adminRoutes.use(authenticate, authorize('equipe'));

adminRoutes.get(
  '/corretores',
  validate(listCorretoresQuery, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.listCorretores(req.query as unknown as ListCorretoresQuery);
    res.json(result);
  }),
);

adminRoutes.post(
  '/corretores/:id/aprovar',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const result = await adminService.aprovarCorretor(req.params.id, req.user.id);
    res.json(result);
  }),
);

adminRoutes.post(
  '/corretores/:id/rejeitar',
  validate(rejeitarSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const { motivo } = req.body as RejeitarInput;
    const result = await adminService.rejeitarCorretor(req.params.id, req.user.id, motivo);
    res.json(result);
  }),
);

adminRoutes.get(
  '/exclusividades',
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await adminService.listarExclusividadesPendentes();
    res.json(result);
  }),
);

adminRoutes.post(
  '/exclusividades/:id/verificar',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const result = await adminService.verificarExclusividade(req.params.id);
    res.json(result);
  }),
);

adminRoutes.post(
  '/exclusividades/:id/rejeitar',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const result = await adminService.rejeitarExclusividade(req.params.id);
    res.json(result);
  }),
);
