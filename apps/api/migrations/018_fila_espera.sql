-- 018_fila_espera.sql — Fase 9: fila de espera de imóveis que entraram EM NEGOCIAÇÃO.
-- Populada com os compradores cuja solicitação estava pendente quando o imóvel saiu
-- da vitrine; notificada (e limpa) quando o imóvel volta a DISPONÍVEL.

CREATE TABLE IF NOT EXISTS fila_espera (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imovel_id    UUID        NOT NULL REFERENCES imovel(id) ON DELETE CASCADE,
  comprador_id UUID        NOT NULL REFERENCES corretor(id),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (imovel_id, comprador_id)
);

CREATE INDEX IF NOT EXISTS idx_fila_imovel ON fila_espera(imovel_id);
