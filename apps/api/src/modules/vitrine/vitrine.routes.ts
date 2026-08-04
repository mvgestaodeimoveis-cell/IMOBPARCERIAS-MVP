import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { badRequest } from '../../lib/errors';
import { vitrineQuerySchema, importarTextoSchema } from '../imoveis/imoveis.schemas';
import type { ImportarTextoInput } from '../imoveis/imoveis.schemas';
import { listarVitrine, obterVitrine, listarBairros } from '../imoveis/imoveis.service';
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
    // O preço da demanda é um alvo, não um teto rígido: abre uma faixa de -15% a +10%
    // em torno dele para não perder imóveis logo abaixo nem os pouco acima (negociáveis).
    const arredondarMil = (n: number) => String(Math.round(n / 1_000) * 1_000);
    const precoMin = e.preco != null ? arredondarMil(e.preco * 0.85) : '';
    const precoMax = e.preco != null ? arredondarMil(e.preco * 1.1) : '';
    res.json({
      filtros: {
        tipo: e.tipo ?? '',
        finalidade: e.finalidade ?? '',
        cidade: e.cidade ?? '',
        bairro: e.bairro ?? '',
        preco_min: precoMin,
        preco_max: precoMax,
        area_min: e.area_m2 != null ? String(Math.round(e.area_m2)) : '',
        quartos_min: e.quartos != null ? String(e.quartos) : '',
      },
      reconhecidos: e.reconhecidos,
    });
  }),
);

vitrineRoutes.get(
  '/bairros',
  asyncHandler(async (req: Request, res: Response) => {
    const cidade = typeof req.query.cidade === 'string' ? req.query.cidade.trim() : '';
    res.json(await listarBairros(cidade || undefined));
  }),
);

vitrineRoutes.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const imovel = await obterVitrine(req.params.id);
    res.json(imovel);
  }),
);
