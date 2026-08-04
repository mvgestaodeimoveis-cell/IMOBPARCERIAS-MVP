-- 029_condominio_infraestrutura.sql — condomínio padronizado (sim/não + infraestrutura)
-- O corretor passa a responder explicitamente se o imóvel está em condomínio. Quando sim,
-- informa (opcionalmente) o nome, o valor mensal (coluna condominio, já existente) e a lista
-- de infraestrutura disponível (piscina, academia, portaria 24h, etc.), exibida padronizada.

ALTER TABLE imovel
  ADD COLUMN IF NOT EXISTS em_condominio             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS condominio_infraestrutura JSONB   NOT NULL DEFAULT '[]'::jsonb;

-- Retrocompatível: imóveis que já tinham nome do condomínio preenchido passam a constar
-- explicitamente como "em condomínio".
UPDATE imovel
   SET em_condominio = true
 WHERE em_condominio = false
   AND nome_condominio IS NOT NULL
   AND btrim(nome_condominio) <> '';
