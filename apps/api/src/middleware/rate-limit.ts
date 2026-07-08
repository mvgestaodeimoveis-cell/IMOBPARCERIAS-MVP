import rateLimit from 'express-rate-limit';

/** Limite mais rígido para rotas de autenticação (anti brute-force). */
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Tente novamente em instantes.' },
  },
});
