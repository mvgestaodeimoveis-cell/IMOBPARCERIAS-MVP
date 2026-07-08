-- 004_imobiliaria.sql — campo opcional "imobiliária" do corretor (resposta B2 do cliente)

ALTER TABLE corretor ADD COLUMN IF NOT EXISTS imobiliaria TEXT;
