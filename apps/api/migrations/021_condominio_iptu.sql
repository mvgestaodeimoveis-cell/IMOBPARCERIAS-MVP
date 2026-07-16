-- 021_condominio_iptu.sql — taxas de condomínio e IPTU (relevante para aluguel)
-- Alguns proprietários já incluem as taxas no valor do aluguel: taxas_inclusas = true
-- desabilita os campos de condomínio/IPTU (que ficam nulos).

ALTER TABLE imovel
  ADD COLUMN IF NOT EXISTS condominio     NUMERIC(12, 2) CHECK (condominio >= 0),
  ADD COLUMN IF NOT EXISTS iptu           NUMERIC(12, 2) CHECK (iptu >= 0),
  ADD COLUMN IF NOT EXISTS taxas_inclusas BOOLEAN NOT NULL DEFAULT false;
