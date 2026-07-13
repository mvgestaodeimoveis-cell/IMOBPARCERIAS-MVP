-- 016_exclusividade_alerta.sql — alerta de vencimento de exclusividade (15 dias antes).
-- Marca quando o alerta foi enviado para não repetir todo dia.

ALTER TABLE imovel ADD COLUMN IF NOT EXISTS exclusividade_alerta_em TIMESTAMPTZ;
