-- 012_termo_parceria_aceite.sql — aceite do Termo de Parceria no cadastro de cada imóvel.
-- Prova de manifestação de vontade: data/hora, IP, identificação (CRECI) e versão + hash do texto.

CREATE TABLE IF NOT EXISTS termo_parceria_aceite (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imovel_id      UUID        NOT NULL REFERENCES imovel(id) ON DELETE CASCADE,
  corretor_id    UUID        NOT NULL REFERENCES corretor(id),
  creci          TEXT,
  versao         TEXT        NOT NULL,
  documento_hash TEXT        NOT NULL,
  ip             INET        NOT NULL,
  user_agent     TEXT        NOT NULL,
  aceito_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_termo_parceria_imovel ON termo_parceria_aceite(imovel_id);
CREATE INDEX IF NOT EXISTS idx_termo_parceria_corretor ON termo_parceria_aceite(corretor_id);
