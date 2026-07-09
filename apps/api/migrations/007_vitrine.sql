-- 007_vitrine.sql — campos para a vitrine (Nível 1): diferenciais e exclusividade

ALTER TABLE imovel ADD COLUMN IF NOT EXISTS diferenciais JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE imovel ADD COLUMN IF NOT EXISTS exclusividade_verificada BOOLEAN NOT NULL DEFAULT false;

-- Índice para acelerar a vitrine (imóveis disponíveis por cidade).
CREATE INDEX IF NOT EXISTS idx_imovel_vitrine ON imovel(status, cidade);
