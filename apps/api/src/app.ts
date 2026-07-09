import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { authRoutes } from './modules/auth/auth.routes';
import { corretoresRoutes } from './modules/corretores/corretores.routes';
import { imoveisRoutes } from './modules/imoveis/imoveis.routes';
import { vitrineRoutes } from './modules/vitrine/vitrine.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { termoRoutes } from './modules/termo/termo.routes';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

export function createApp() {
  const app = express();

  // Atrás de proxy (Render/Vercel) — necessário para req.ip via X-Forwarded-For.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  const api = express.Router();
  api.use('/auth', authRoutes);
  api.use('/corretores', corretoresRoutes);
  api.use('/imoveis', imoveisRoutes);
  api.use('/vitrine', vitrineRoutes);
  api.use('/admin', adminRoutes);
  api.use('/termo', termoRoutes);
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
