-- 009_documentacao_exclusividade.sql — Seção 2.4 (documentação) e Fase 2/7.5 (exclusividade)

ALTER TABLE imovel ADD COLUMN IF NOT EXISTS documentacao JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE imovel ADD COLUMN IF NOT EXISTS exclusividade BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE imovel ADD COLUMN IF NOT EXISTS exclusividade_contrato_url TEXT;
ALTER TABLE imovel ADD COLUMN IF NOT EXISTS exclusividade_vencimento DATE;
ALTER TABLE imovel ADD COLUMN IF NOT EXISTS exclusividade_status TEXT NOT NULL DEFAULT 'nao'
  CHECK (exclusividade_status IN ('nao', 'pendente', 'verificada', 'rejeitada'));

CREATE INDEX IF NOT EXISTS idx_imovel_exclusividade ON imovel(exclusividade_status)
  WHERE exclusividade_status = 'pendente';
