-- 005_email_verificacao.sql — confirmação de e-mail (double opt-in) para cadastro normal

ALTER TABLE corretor ADD COLUMN IF NOT EXISTS email_verificado_em TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS email_verificacao_token (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretor_id UUID        NOT NULL REFERENCES corretor(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verif_corretor ON email_verificacao_token(corretor_id);
