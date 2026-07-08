import { Router } from 'express';
import { env } from '../../config/env';

export const termoRoutes = Router();

/**
 * Texto do Termo de Uso vigente.
 * Placeholder até o cliente enviar o texto oficial (definição pendente D1/D2).
 */
const TERMO_TEXTO = `TERMO DE USO — IMOB PARCERIAS (VERSÃO PRELIMINAR)

Este é um texto provisório. O conteúdo oficial será fornecido pelo cliente antes do
lançamento. Ao marcar o aceite, o corretor concorda com os termos aqui apresentados,
e o aceite é registrado com IP, data/hora e identificação do dispositivo.`;

termoRoutes.get('/atual', (_req, res) => {
  res.json({ versao: env.TERMO_VERSAO, texto: TERMO_TEXTO });
});
