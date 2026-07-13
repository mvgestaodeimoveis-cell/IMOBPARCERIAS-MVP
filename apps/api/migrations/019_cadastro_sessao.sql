-- 019_cadastro_sessao.sql — funil de cadastro de imóvel (KPI taxa de abandono, Seção 1.6).
-- Uma sessão é aberta quando o corretor inicia o cadastro; marcada como concluída ao publicar.

CREATE TABLE IF NOT EXISTS cadastro_imovel_sessao (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretor_id  UUID        NOT NULL REFERENCES corretor(id) ON DELETE CASCADE,
  imovel_id    UUID        REFERENCES imovel(id) ON DELETE SET NULL,
  iniciado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluido_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cadastro_sessao_corretor ON cadastro_imovel_sessao(corretor_id) WHERE concluido_em IS NULL;
