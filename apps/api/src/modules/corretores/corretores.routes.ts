import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { notFound, unauthorized } from '../../lib/errors';
import { getCorretorById } from '../auth/auth.service';

export const corretoresRoutes = Router();

corretoresRoutes.get(
  '/me',
  authenticate,
  authorize('corretor'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const corretor = await getCorretorById(req.user.id);
    if (!corretor) throw notFound('Corretor não encontrado.');
    res.json(corretor);
  }),
);
