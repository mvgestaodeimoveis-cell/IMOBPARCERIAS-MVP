-- 024_visita_feedback.sql
-- Feedback pós-visita (item 3): após a data/hora agendada da visita, os dois
-- corretores recebem um e-mail para registrar o resultado. feedback_solicitado_em
-- evita reenvio (e é zerado a cada nova proposta de visita — revisita). As respostas
-- ficam em parceria_visita_feedback (visíveis para a equipe no admin).

ALTER TABLE parceria
  ADD COLUMN IF NOT EXISTS feedback_solicitado_em TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS parceria_visita_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceria_id UUID NOT NULL REFERENCES parceria(id) ON DELETE CASCADE,
  autor_id    UUID NOT NULL REFERENCES corretor(id),
  resultado   TEXT NOT NULL,
  observacao  TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visita_feedback_parceria
  ON parceria_visita_feedback (parceria_id);
