-- 020_selecao_compartilhada.sql — link curto para o corretor compartilhar imóveis com o cliente.
-- Antes, a seleção era codificada na própria URL (/ver/<base64 gigante>), o que gerava links
-- enormes no WhatsApp. Agora a seleção fica guardada aqui e o link carrega só um código curto.

CREATE TABLE IF NOT EXISTS selecao_compartilhada (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        TEXT        NOT NULL UNIQUE,
  corretor_id   UUID        NOT NULL REFERENCES corretor(id) ON DELETE CASCADE,
  imovel_ids    JSONB       NOT NULL,
  corretor_nome TEXT,
  whatsapp      TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_selecao_codigo ON selecao_compartilhada(codigo);
