import { Router } from 'express';
import {
  TERMO_PARCERIA_RESUMO,
  TERMO_PARCERIA_TEXTO,
  TERMO_PARCERIA_VERSAO,
} from '../../lib/termo-parceria';
import { TERMO_USO_TEXTO, TERMO_USO_VERSAO } from '../../lib/termo-uso';
import {
  POLITICA_PRIVACIDADE_TEXTO,
  POLITICA_PRIVACIDADE_VERSAO,
} from '../../lib/politica-privacidade';

export const termoRoutes = Router();

/** Texto do Termo de Uso vigente (oficial). */
termoRoutes.get('/atual', (_req, res) => {
  res.json({ versao: TERMO_USO_VERSAO, texto: TERMO_USO_TEXTO });
});

/** Termo de Parceria vigente (aceito no cadastro de cada imóvel). */
termoRoutes.get('/parceria', (_req, res) => {
  res.json({
    versao: TERMO_PARCERIA_VERSAO,
    texto: TERMO_PARCERIA_TEXTO,
    resumo: TERMO_PARCERIA_RESUMO,
  });
});

/** Política de Privacidade vigente (LGPD). */
termoRoutes.get('/privacidade', (_req, res) => {
  res.json({ versao: POLITICA_PRIVACIDADE_VERSAO, texto: POLITICA_PRIVACIDADE_TEXTO });
});
