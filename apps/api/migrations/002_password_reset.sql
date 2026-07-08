-- 002_password_reset.sql — tokens de recuperação de senha

CREATE TABLE password_reset_token (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretor_id  UUID        NOT NULL REFERENCES corretor(id) ON DELETE CASCADE,
  token_hash   TEXT        NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_corretor ON password_reset_token(corretor_id);
