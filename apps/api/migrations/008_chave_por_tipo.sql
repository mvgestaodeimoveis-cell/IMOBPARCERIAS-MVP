-- 008_chave_por_tipo.sql — campos da chave única por tipo de imóvel (Seção 5 do escopo)

ALTER TABLE imovel ADD COLUMN IF NOT EXISTS unidade         TEXT; -- apto / sala
ALTER TABLE imovel ADD COLUMN IF NOT EXISTS andar           TEXT;
ALTER TABLE imovel ADD COLUMN IF NOT EXISTS bloco           TEXT; -- bloco / torre
ALTER TABLE imovel ADD COLUMN IF NOT EXISTS nome_condominio TEXT; -- casa em condomínio fechado

-- Chave do prédio (endereço-base): usada para detectar DUPLICATA POSSÍVEL (apto/comercial).
ALTER TABLE imovel ADD COLUMN IF NOT EXISTS chave_predio TEXT;
CREATE INDEX IF NOT EXISTS idx_imovel_predio ON imovel(chave_predio) WHERE status = 'ativo';
