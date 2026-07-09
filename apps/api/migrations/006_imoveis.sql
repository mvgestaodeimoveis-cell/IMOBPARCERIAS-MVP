-- 006_imoveis.sql — cadastro de imóveis (Sprint 2) com chave anti-duplicata global

CREATE TABLE imovel (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretor_id   UUID        NOT NULL REFERENCES corretor(id) ON DELETE CASCADE,
  finalidade    TEXT        NOT NULL CHECK (finalidade IN ('venda', 'aluguel')),
  tipo          TEXT        NOT NULL CHECK (tipo IN ('apartamento', 'casa', 'terreno', 'comercial')),
  preco         NUMERIC(14, 2) NOT NULL CHECK (preco >= 0),
  cidade        TEXT        NOT NULL,
  bairro        TEXT        NOT NULL,
  cep           TEXT        NOT NULL,
  logradouro    TEXT        NOT NULL,
  numero        TEXT        NOT NULL,
  complemento   TEXT,
  area_m2       NUMERIC(10, 2),
  quartos       INTEGER,
  suites        INTEGER,
  banheiros     INTEGER,
  vagas         INTEGER,
  descricao     TEXT,
  fotos         JSONB       NOT NULL DEFAULT '[]'::jsonb,
  chave_dedupe  TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'ativo'
                CHECK (status IN ('ativo', 'inativo', 'vendido')),
  origem        TEXT        NOT NULL DEFAULT 'manual'
                CHECK (origem IN ('manual', 'importado')),
  link_origem   TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exclusividade: um imóvel ativo por chave (CEP + número + complemento) em toda a rede.
CREATE UNIQUE INDEX uq_imovel_dedupe_ativo ON imovel(chave_dedupe) WHERE status = 'ativo';
CREATE INDEX idx_imovel_corretor ON imovel(corretor_id);
CREATE INDEX idx_imovel_cidade ON imovel(cidade);
CREATE INDEX idx_imovel_status ON imovel(status);
