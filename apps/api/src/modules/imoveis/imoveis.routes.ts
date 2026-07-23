import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { badRequest, unauthorized } from '../../lib/errors';
import { assinarUpload, isCloudinaryConfigured } from '../../lib/cloudinary';
import { importarDeUrl } from '../../lib/importer';
import { parseImovelTexto } from '../../lib/parse-imovel-texto';
import { atualizarImovelSchema, criarImovelSchema, importarImovelSchema, importarTextoSchema } from './imoveis.schemas';
import type { AtualizarImovelInput, CriarImovelInput, ImportarImovelInput, ImportarTextoInput } from './imoveis.schemas';
import * as imoveis from './imoveis.service';

export const imoveisRoutes = Router();

imoveisRoutes.use(authenticate, authorize('corretor'));

imoveisRoutes.post(
  '/importar',
  validate(importarImovelSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const draft = await importarDeUrl((req.body as ImportarImovelInput).url);
    res.json(draft);
  }),
);

imoveisRoutes.post(
  '/importar-texto',
  validate(importarTextoSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const texto = (req.body as ImportarTextoInput).texto;
    const extraido = parseImovelTexto(texto);
    // Registra a colagem + o que foi reconhecido (histórico p/ evoluir o parser). Best-effort.
    void imoveis.registrarImportTexto(req.user.id, texto, extraido.reconhecidos, 'cadastro');
    res.json(extraido);
  }),
);

// Funil (KPI): registra o início do cadastro de imóvel.
imoveisRoutes.post(
  '/cadastro-sessao',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    res.status(201).json(await imoveis.iniciarSessaoCadastro(req.user.id));
  }),
);

imoveisRoutes.post(
  '/upload-assinatura',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    if (!isCloudinaryConfigured()) {
      throw badRequest('Upload de fotos ainda não está configurado.');
    }
    const folder = req.query.folder === 'contratos' ? 'contratos' : 'imoveis';
    res.json(assinarUpload(folder));
  }),
);

imoveisRoutes.post(
  '/',
  validate(criarImovelSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const userAgent = req.get('user-agent') ?? 'desconhecido';
    const imovel = await imoveis.criarImovel(req.user.id, req.body as CriarImovelInput, {
      ip,
      userAgent,
    });
    res.status(201).json(imovel);
  }),
);

imoveisRoutes.get(
  '/me',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const lista = await imoveis.listarMeusImoveis(req.user.id);
    res.json({ data: lista });
  }),
);

imoveisRoutes.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const imovel = await imoveis.obterImovelDoDono(req.params.id, req.user.id);
    res.json(imovel);
  }),
);

imoveisRoutes.patch(
  '/:id',
  validate(atualizarImovelSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    const imovel = await imoveis.atualizarImovel(
      req.params.id,
      req.user.id,
      req.body as AtualizarImovelInput,
    );
    res.json(imovel);
  }),
);

imoveisRoutes.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw unauthorized();
    await imoveis.removerImovel(req.params.id, req.user.id);
    res.status(204).send();
  }),
);
