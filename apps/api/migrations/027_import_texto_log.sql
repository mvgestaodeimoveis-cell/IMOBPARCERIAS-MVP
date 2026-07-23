-- 027_import_texto_log.sql
-- Histórico das importações por texto (colar do WhatsApp) no cadastro de imóvel.
-- Guarda o texto colado e quais campos o parser reconheceu, para diagnosticar formatos
-- que falham SEM precisar pedir o texto ao corretor toda vez, e para evoluir o parser
-- com base em casos reais. São dados de imóvel (não pessoais de terceiros).

CREATE TABLE IF NOT EXISTS import_texto_log (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretor_id        UUID REFERENCES corretor(id) ON DELETE SET NULL,
  texto              TEXT NOT NULL,
  reconhecidos       JSONB NOT NULL DEFAULT '[]'::jsonb,
  reconhecidos_count INTEGER NOT NULL DEFAULT 0,
  origem             TEXT NOT NULL DEFAULT 'cadastro',
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_log_criado ON import_texto_log (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_import_log_falhas ON import_texto_log (reconhecidos_count, criado_em DESC);
