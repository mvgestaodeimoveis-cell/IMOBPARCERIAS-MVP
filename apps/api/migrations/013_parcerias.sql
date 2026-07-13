-- 013_parcerias.sql — Fase 6 do escopo: solicitação de parceria + contrato digital.
-- O status do imóvel só muda para EM NEGOCIAÇÃO após a confirmação bilateral (Fase 7).

CREATE TABLE IF NOT EXISTS parceria (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imovel_id         UUID        NOT NULL REFERENCES imovel(id) ON DELETE CASCADE,
  captador_id       UUID        NOT NULL REFERENCES corretor(id),  -- dono do imóvel
  comprador_id      UUID        NOT NULL REFERENCES corretor(id),  -- solicitante (traz o cliente)
  cliente_nome      TEXT        NOT NULL,
  perfil_confirmado BOOLEAN     NOT NULL DEFAULT true,
  status            TEXT        NOT NULL DEFAULT 'solicitada'
                    CHECK (status IN ('solicitada','aceita','recusada','em_negociacao','encerrada','cancelada')),
  contrato_versao   TEXT,
  janela_dias       INTEGER     NOT NULL DEFAULT 180,
  -- Confirmação bilateral (Fase 7 — preenchidos na próxima etapa)
  visita_em         TIMESTAMPTZ,   -- campo exclusivo do captador
  cpf_cliente       TEXT,          -- campo exclusivo do comprador
  confirmada_em     TIMESTAMPTZ,   -- quando as duas confirmações ocorreram
  janela_ativada_em TIMESTAMPTZ,   -- início da janela de 180 dias
  recusa_motivo     TEXT,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Um comprador não pode ter duas solicitações ativas para o mesmo imóvel.
CREATE UNIQUE INDEX IF NOT EXISTS uq_parceria_ativa
  ON parceria(imovel_id, comprador_id)
  WHERE status IN ('solicitada','aceita','em_negociacao');

CREATE INDEX IF NOT EXISTS idx_parceria_captador ON parceria(captador_id);
CREATE INDEX IF NOT EXISTS idx_parceria_comprador ON parceria(comprador_id);
CREATE INDEX IF NOT EXISTS idx_parceria_imovel ON parceria(imovel_id);
