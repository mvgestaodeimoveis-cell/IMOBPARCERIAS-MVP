-- 003_cadastro_em_etapas.sql — cadastro em duas fases (captura de lead na etapa 1)

-- Campos preenchidos apenas na etapa 2 passam a ser opcionais.
ALTER TABLE corretor ALTER COLUMN creci DROP NOT NULL;
ALTER TABLE corretor ALTER COLUMN whatsapp DROP NOT NULL;
ALTER TABLE corretor ALTER COLUMN cidade DROP NOT NULL;

-- Novo status para lead com cadastro incompleto.
ALTER TABLE corretor DROP CONSTRAINT corretor_status_check;
ALTER TABLE corretor ADD CONSTRAINT corretor_status_check
  CHECK (status IN ('cadastro_incompleto', 'verificacao_pendente', 'ativo', 'rejeitado', 'suspenso'));
