-- 011_google_oauth.sql — vínculo de conta Google (login social). Feature opcional,
-- ativada apenas quando as credenciais do Google estão configuradas no ambiente.

-- Identificador único e estável do usuário no Google (claim `sub`).
ALTER TABLE corretor ADD COLUMN IF NOT EXISTS google_sub TEXT;

-- Um mesmo Google só pode estar vinculado a um corretor.
CREATE UNIQUE INDEX IF NOT EXISTS idx_corretor_google_sub
  ON corretor(google_sub) WHERE google_sub IS NOT NULL;

-- Contas criadas via Google podem não ter senha local.
ALTER TABLE corretor ALTER COLUMN senha_hash DROP NOT NULL;
