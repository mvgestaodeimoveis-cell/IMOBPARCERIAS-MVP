-- 015_venda_avaliacao.sql — Fases 8 e 9: fechamento da venda, cobrança PIX, avaliação mútua.

-- Novo status 'vendida' na parceria.
ALTER TABLE parceria DROP CONSTRAINT IF EXISTS parceria_status_check;
ALTER TABLE parceria ADD CONSTRAINT parceria_status_check
  CHECK (status IN ('solicitada','aceita','recusada','em_negociacao','vendida','encerrada','cancelada'));

-- Dados da venda e da cobrança (comissão 5%, taxa 10% da comissão — Seção 7.1).
ALTER TABLE parceria ADD COLUMN IF NOT EXISTS venda_valor            NUMERIC(14,2);
ALTER TABLE parceria ADD COLUMN IF NOT EXISTS comissao               NUMERIC(14,2);
ALTER TABLE parceria ADD COLUMN IF NOT EXISTS taxa_plataforma        NUMERIC(14,2);
ALTER TABLE parceria ADD COLUMN IF NOT EXISTS venda_declarada_em     TIMESTAMPTZ;
ALTER TABLE parceria ADD COLUMN IF NOT EXISTS pagamento_status       TEXT NOT NULL DEFAULT 'nao_aplicavel'
  CHECK (pagamento_status IN ('nao_aplicavel','pendente','confirmado'));
ALTER TABLE parceria ADD COLUMN IF NOT EXISTS pagamento_vencimento   DATE;
ALTER TABLE parceria ADD COLUMN IF NOT EXISTS pagamento_confirmado_em TIMESTAMPTZ;

-- Avaliação mútua (1 a 5 estrelas), liberada após confirmação do pagamento.
CREATE TABLE IF NOT EXISTS avaliacao (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceria_id UUID        NOT NULL REFERENCES parceria(id) ON DELETE CASCADE,
  autor_id    UUID        NOT NULL REFERENCES corretor(id),
  alvo_id     UUID        NOT NULL REFERENCES corretor(id),
  nota        INTEGER     NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario  TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parceria_id, autor_id)
);

CREATE INDEX IF NOT EXISTS idx_avaliacao_alvo ON avaliacao(alvo_id);
CREATE INDEX IF NOT EXISTS idx_parceria_pagamento ON parceria(pagamento_status) WHERE pagamento_status = 'pendente';
