-- 023_visita_confirmacao_leitura.sql
-- Visita: qualquer corretor propõe data+hora → o outro confirma (gatilho bilateral).
-- Leitura/notificação de mensagens: controle de não lidas + cooldown de e-mail.

ALTER TABLE parceria
  ADD COLUMN IF NOT EXISTS visita_proposta_por     UUID REFERENCES corretor(id),
  ADD COLUMN IF NOT EXISTS visita_confirmada_em    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS captador_lido_em        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS comprador_lido_em       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS captador_notificado_em  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS comprador_notificado_em TIMESTAMPTZ;
