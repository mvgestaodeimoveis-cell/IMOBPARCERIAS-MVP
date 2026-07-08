import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { notFound, unauthorized } from '../../lib/errors';
import { completarCadastro, getCorretorById } from '../auth/auth.service';
import { completarCadastroSchema, type CompletarCadastroInput } from '../auth/auth.schemas';

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

corretoresRoutes.post(
  '/completar-cadastro',
  authenticate,
  authorize('corretor'),
  validate(completarCadastroSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const result = await completarCadastro(
      req.user.id,
      req.body as CompletarCadastroInput,
      ip,
      req.get('user-agent') ?? 'desconhecido',
    );
    res.json(result);
  }),
);
