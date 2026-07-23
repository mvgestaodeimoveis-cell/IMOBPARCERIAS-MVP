import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { unauthorized } from '../../lib/errors';
import { listCorretoresQuery, listImoveisQuery, listDenunciasQuery, listParceriasQuery, rejeitarSchema, resolverDenunciaSchema, criarAdminSchema, type ListCorretoresQuery, type ListImoveisQuery, type ListDenunciasQuery, type ListParceriasQuery, type RejeitarInput, type ResolverDenunciaInput, type CriarAdminInput } from './admin.schemas';
import * as adminService from './admin.service';
import * as parceriasService from '../parcerias/parcerias.service';

export const adminRoutes = Router();

adminRoutes.use(authenticate, authorize('equipe'));

adminRoutes.get(
  '/metricas',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(await adminService.metricas());
  }),
);

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

adminRoutes.post(
  '/corretores/:id/suspender',
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await adminService.suspenderCorretor(req.params.id));
  }),
);

adminRoutes.post(
  '/corretores/:id/reativar',
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await adminService.reativarCorretor(req.params.id));
  }),
);

adminRoutes.delete(
  '/corretores/:id',
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await adminService.excluirCorretor(req.params.id));
  }),
);

adminRoutes.get(
  '/corretores/:id/aceites',
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await adminService.listarAceitesTermo(req.params.id));
  }),
);

// Monitoramento de conversas (chat) — a equipe acompanha as interações.
adminRoutes.get(
  '/conversas',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(await adminService.listarConversasAdmin());
  }),
);

adminRoutes.get(
  '/conversas/:id',
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await adminService.obterConversaAdmin(req.params.id));
  }),
);

// Denúncias / relatos de problema abertos pelos corretores no chat.
adminRoutes.get(
  '/denuncias',
  validate(listDenunciasQuery, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.query as unknown as ListDenunciasQuery;
    res.json(await adminService.listarDenuncias(status));
  }),
);

adminRoutes.post(
  '/denuncias/:id/resolver',
  validate(resolverDenunciaSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const { nota } = req.body as ResolverDenunciaInput;
    res.json(await adminService.resolverDenuncia(req.params.id, req.user.id, nota));
  }),
);

// Acompanhamento de todas as parcerias (equipe).
adminRoutes.get(
  '/parcerias',
  validate(listParceriasQuery, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.query as unknown as ListParceriasQuery;
    res.json(await adminService.listarParceriasAdmin(status));
  }),
);

// Moderação de imóveis (equipe).
adminRoutes.get(
  '/imoveis',
  validate(listImoveisQuery, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await adminService.listImoveis(req.query as unknown as ListImoveisQuery));
  }),
);

adminRoutes.post(
  '/imoveis/:id/desabilitar',
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await adminService.desabilitarImovel(req.params.id));
  }),
);

adminRoutes.post(
  '/imoveis/:id/reativar',
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await adminService.reativarImovel(req.params.id));
  }),
);

adminRoutes.delete(
  '/imoveis/:id',
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await adminService.excluirImovel(req.params.id));
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

adminRoutes.get(
  '/equipe',
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await adminService.listarAdmins();
    res.json(result);
  }),
);

adminRoutes.post(
  '/equipe',
  validate(criarAdminSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.criarAdmin(req.body as CriarAdminInput);
    res.status(201).json(result);
  }),
);

// Cobrança PIX (Fase 8) — confirmação manual pela equipe.
adminRoutes.get(
  '/pagamentos',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(await parceriasService.listarPagamentosPendentes());
  }),
);

adminRoutes.post(
  '/parcerias/:id/pagamento',
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await parceriasService.confirmarPagamento(req.params.id));
  }),
);
