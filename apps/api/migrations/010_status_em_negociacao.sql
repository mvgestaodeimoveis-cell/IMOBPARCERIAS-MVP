-- Status oficiais do imóvel: DISPONÍVEL (ativo), EM NEGOCIAÇÃO, VENDIDO, INATIVO.
ALTER TABLE imovel DROP CONSTRAINT IF EXISTS imovel_status_check;
ALTER TABLE imovel
  ADD CONSTRAINT imovel_status_check
  CHECK (status IN ('ativo', 'em_negociacao', 'vendido', 'inativo'));
