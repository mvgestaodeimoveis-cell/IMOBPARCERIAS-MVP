import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { unauthorized } from '../../lib/errors';
import {
  avaliacaoSchema,
  cpfSchema,
  mensagemSchema,
  recusarParceriaSchema,
  solicitarParceriaSchema,
  vendaSchema,
  visitaSchema,
  type AvaliacaoInput,
  type CpfInput,
  type MensagemInput,
  type RecusarParceriaInput,
  type SolicitarParceriaInput,
  type VendaInput,
  type VisitaInput,
} from './parcerias.schemas';
import * as parcerias from './parcerias.service';

export const parceriasRoutes = Router();

parceriasRoutes.use(authenticate, authorize('corretor'));

// Corretor-comprador solicita parceria (Fase 6).
parceriasRoutes.post(
  '/',
  validate(solicitarParceriaSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const result = await parcerias.solicitarParceria(req.user.id, req.body as SolicitarParceriaInput);
    res.status(201).json(result);
  }),
);

// Parcerias recebidas (como captador) e enviadas (como comprador).
parceriasRoutes.get(
  '/recebidas',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    res.json(await parcerias.listarRecebidas(req.user.id));
  }),
);

parceriasRoutes.get(
  '/enviadas',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    res.json(await parcerias.listarEnviadas(req.user.id));
  }),
);

// Central de conversas (parcerias com chat).
parceriasRoutes.get(
  '/conversas',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    res.json(await parcerias.listarConversas(req.user.id));
  }),
);

parceriasRoutes.post(
  '/:id/aceitar',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    res.json(await parcerias.aceitarParceria(req.params.id, req.user.id));
  }),
);

parceriasRoutes.post(
  '/:id/recusar',
  validate(recusarParceriaSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const { motivo } = req.body as RecusarParceriaInput;
    res.json(await parcerias.recusarParceria(req.params.id, req.user.id, motivo));
  }),
);

parceriasRoutes.post(
  '/:id/cancelar',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    res.json(await parcerias.cancelarParceria(req.params.id, req.user.id));
  }),
);

parceriasRoutes.get(
  '/:id/contrato',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    res.json(await parcerias.obterContrato(req.params.id, req.user.id));
  }),
);

// Fase 7 — detalhe, chat e confirmação bilateral.
parceriasRoutes.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    res.json(await parcerias.obterParceria(req.params.id, req.user.id));
  }),
);

parceriasRoutes.get(
  '/:id/mensagens',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    res.json(await parcerias.listarMensagens(req.params.id, req.user.id));
  }),
);

parceriasRoutes.post(
  '/:id/mensagens',
  validate(mensagemSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const { corpo } = req.body as MensagemInput;
    res.status(201).json(await parcerias.enviarMensagem(req.params.id, req.user.id, corpo));
  }),
);

parceriasRoutes.post(
  '/:id/visita',
  validate(visitaSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const { visita_em } = req.body as VisitaInput;
    res.json(await parcerias.registrarVisita(req.params.id, req.user.id, visita_em));
  }),
);

parceriasRoutes.post(
  '/:id/cpf',
  validate(cpfSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const { cpf } = req.body as CpfInput;
    res.json(await parcerias.inserirCpf(req.params.id, req.user.id, cpf));
  }),
);

// Fase 8/9 — venda, encerramento e avaliação.
parceriasRoutes.post(
  '/:id/venda',
  validate(vendaSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const { valor } = req.body as VendaInput;
    res.json(await parcerias.declararVenda(req.params.id, req.user.id, valor));
  }),
);

parceriasRoutes.post(
  '/:id/encerrar',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    res.json(await parcerias.encerrarSemVenda(req.params.id, req.user.id));
  }),
);

parceriasRoutes.post(
  '/:id/avaliacao',
  validate(avaliacaoSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const { nota, comentario } = req.body as AvaliacaoInput;
    res.status(201).json(await parcerias.avaliar(req.params.id, req.user.id, nota, comentario));
  }),
);
