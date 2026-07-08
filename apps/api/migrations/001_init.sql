-- 001_init.sql — tabelas base da Sprint 1 (Base e Corretores)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Usuário da equipe (admin) que verifica CRECI e aprova cadastros
CREATE TABLE usuario_equipe (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT        NOT NULL,
  email       TEXT        NOT NULL UNIQUE,
  senha_hash  TEXT        NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Corretor (captador / comprador / ambos)
CREATE TABLE corretor (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                TEXT        NOT NULL,
  email               TEXT        NOT NULL UNIQUE,
  senha_hash          TEXT        NOT NULL,
  creci               TEXT        NOT NULL UNIQUE,
  whatsapp            TEXT        NOT NULL,
  cidade              TEXT        NOT NULL,
  papel               TEXT        NOT NULL DEFAULT 'captador'
                      CHECK (papel IN ('captador', 'comprador', 'ambos')),
  status              TEXT        NOT NULL DEFAULT 'verificacao_pendente'
                      CHECK (status IN ('verificacao_pendente', 'ativo', 'rejeitado', 'suspenso')),
  creci_verificado_em TIMESTAMPTZ,
  verificado_por      UUID        REFERENCES usuario_equipe(id),
  motivo_rejeicao     TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_corretor_status ON corretor(status);

-- Aceite do Termo de Uso (evidência jurídica: IP + user-agent + timestamp)
CREATE TABLE termo_aceite (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretor_id  UUID        NOT NULL REFERENCES corretor(id) ON DELETE CASCADE,
  versao_termo TEXT        NOT NULL,
  ip           INET        NOT NULL,
  user_agent   TEXT        NOT NULL,
  aceito_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_termo_aceite_corretor ON termo_aceite(corretor_id);

-- Refresh tokens (opacos, armazenados como hash; revogáveis no logout)
CREATE TABLE refresh_token (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash  TEXT        NOT NULL UNIQUE,
  subject_id  UUID        NOT NULL,
  role        TEXT        NOT NULL CHECK (role IN ('corretor', 'equipe')),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_token_subject ON refresh_token(subject_id);
