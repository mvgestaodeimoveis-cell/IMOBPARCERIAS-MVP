import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { validate } from '../../middleware/validate';
import { authRateLimit } from '../../middleware/rate-limit';
import {
  confirmarEmailSchema,
  esqueciSenhaSchema,
  loginSchema,
  redefinirSenhaSchema,
  refreshSchema,
  registroSchema,
} from './auth.schemas';
import * as authController from './auth.controller';

export const authRoutes = Router();

authRoutes.post(
  '/registro',
  authRateLimit,
  validate(registroSchema),
  asyncHandler(authController.registro),
);

authRoutes.post(
  '/login',
  authRateLimit,
  validate(loginSchema),
  asyncHandler(authController.login),
);

authRoutes.post(
  '/equipe/login',
  authRateLimit,
  validate(loginSchema),
  asyncHandler(authController.loginEquipe),
);

authRoutes.post('/refresh', validate(refreshSchema), asyncHandler(authController.refresh));

authRoutes.post('/logout', validate(refreshSchema), asyncHandler(authController.logout));

authRoutes.post(
  '/senha/esqueci',
  authRateLimit,
  validate(esqueciSenhaSchema),
  asyncHandler(authController.esqueciSenha),
);

authRoutes.post(
  '/senha/redefinir',
  authRateLimit,
  validate(redefinirSenhaSchema),
  asyncHandler(authController.redefinirSenha),
);

authRoutes.post(
  '/confirmar-email',
  authRateLimit,
  validate(confirmarEmailSchema),
  asyncHandler(authController.confirmarEmail),
);
