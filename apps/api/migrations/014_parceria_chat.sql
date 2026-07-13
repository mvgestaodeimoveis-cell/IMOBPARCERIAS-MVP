-- 014_parceria_chat.sql — Fase 7: chat interno mediado entre os corretores da parceria.
-- Histórico permanente como evidência jurídica (regra 7.3 do escopo).

CREATE TABLE IF NOT EXISTS parceria_mensagem (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceria_id UUID        NOT NULL REFERENCES parceria(id) ON DELETE CASCADE,
  autor_id    UUID        NOT NULL REFERENCES corretor(id),
  corpo       TEXT        NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parceria_msg ON parceria_mensagem(parceria_id, criado_em);
