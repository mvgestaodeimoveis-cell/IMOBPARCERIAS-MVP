import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { badRequest } from '../lib/errors';

type Target = 'body' | 'query' | 'params';

/** Valida e substitui req[target] pelos dados já parseados/normalizados. */
export function validate(schema: ZodTypeAny, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || target;
        if (!fields[key]) fields[key] = issue.message;
      }
      throw badRequest('Dados inválidos.', fields);
    }
    req[target] = result.data;
    next();
  };
}
