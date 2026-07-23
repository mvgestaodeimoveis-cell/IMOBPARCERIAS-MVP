-- 026_dedupe_casa_logradouro.sql
-- Falso positivo "Você já cadastrou este imóvel": a chave de deduplicação de CASA
-- era `casa|CEP|número`. Em cidades com CEP "geral", casas DIFERENTES (ruas
-- diferentes, mesmo número) colidiam e o 2º cadastro era barrado indevidamente.
-- A chave passou a incluir o logradouro normalizado (`casa|CEP|número|logradouro`).
-- Aqui recalculamos a chave das casas JÁ cadastradas (sem condomínio) para o novo
-- formato, mantendo a consistência com o código (chaveDedupe em imoveis.service.ts).
-- Observação: o índice único parcial é só para status='ativo' e a mudança apenas
-- torna a chave MAIS específica, então não há risco de conflito nesta migração.

UPDATE imovel
SET chave_dedupe = chave_dedupe || '|' || lower(btrim(coalesce(logradouro, '')))
WHERE tipo = 'casa'
  AND nome_condominio IS NULL
  AND chave_dedupe LIKE 'casa|%';
