-- 025_parceria_denuncia.sql
-- Canal de denúncia/relato no chat entre corretores: qualquer participante da
-- parceria pode reportar falha técnica, conduta indevida, tentativa de negociar
-- fora da plataforma etc. A equipe recebe por e-mail e acompanha/resolve no admin.

CREATE TABLE IF NOT EXISTS parceria_denuncia (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceria_id   UUID NOT NULL REFERENCES parceria(id) ON DELETE CASCADE,
  autor_id      UUID NOT NULL REFERENCES corretor(id),
  categoria     TEXT NOT NULL,
  descricao     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pendente'
                CHECK (status IN ('pendente', 'em_analise', 'resolvida')),
  resolucao_nota TEXT,
  resolvido_por UUID REFERENCES usuario_equipe(id),
  resolvido_em  TIMESTAMPTZ,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_denuncia_parceria ON parceria_denuncia (parceria_id);
CREATE INDEX IF NOT EXISTS idx_denuncia_status ON parceria_denuncia (status, criado_em DESC);
