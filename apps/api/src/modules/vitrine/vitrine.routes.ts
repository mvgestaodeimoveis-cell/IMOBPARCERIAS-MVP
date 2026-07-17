import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { badRequest } from '../../lib/errors';
import { vitrineQuerySchema, importarTextoSchema } from '../imoveis/imoveis.schemas';
import type { ImportarTextoInput } from '../imoveis/imoveis.schemas';
import { listarVitrine, obterVitrine } from '../imoveis/imoveis.service';
import { parseImovelTexto } from '../../lib/parse-imovel-texto';

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

// Interpreta o texto do cliente (WhatsApp) e devolve filtros prontos para a busca.
vitrineRoutes.post(
  '/interpretar',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = importarTextoSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Cole o que o cliente procura.');
    const e = parseImovelTexto((parsed.data as ImportarTextoInput).texto);
    res.json({
      filtros: {
        tipo: e.tipo ?? '',
        finalidade: e.finalidade ?? '',
        cidade: e.cidade ?? '',
        bairro: e.bairro ?? '',
        preco_max: e.preco != null ? String(e.preco) : '',
        area_min: e.area_m2 != null ? String(Math.round(e.area_m2)) : '',
        quartos_min: e.quartos != null ? String(e.quartos) : '',
      },
      reconhecidos: e.reconhecidos,
    });
  }),
);

vitrineRoutes.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const imovel = await obterVitrine(req.params.id);
    res.json(imovel);
  }),
);
