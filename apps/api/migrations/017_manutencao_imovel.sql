-- 017_manutencao_imovel.sql — Fase 3: fluxo escalonado de manutenção mensal do imóvel.
-- 1º aviso (30d sem atualização) → 2º aviso (+7d) → INATIVO (+5d). Reset ao atualizar.

ALTER TABLE imovel ADD COLUMN IF NOT EXISTS manutencao_aviso1_em TIMESTAMPTZ;
ALTER TABLE imovel ADD COLUMN IF NOT EXISTS manutencao_aviso2_em TIMESTAMPTZ;
