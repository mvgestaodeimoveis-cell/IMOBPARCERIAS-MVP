-- 028_duplicata_suspeita.sql
-- Rede de segurança (soft) contra duplicatas de CASA/TERRENO entre corretores diferentes.
-- A chave de deduplicação exige CEP + número + logradouro idênticos; dois corretores que
-- digitam o mesmo endereço de formas diferentes (ou um marca condomínio e o outro não)
-- cadastram o MESMO imóvel sem colidir na chave exata. Aqui guardamos "suspeitas" (mesmo
-- tipo/cidade/bairro e faixa de preço próxima) para a equipe revisar no admin. NÃO bloqueia
-- o cadastro — é um sinal, não uma trava (evita barrar imóveis realmente distintos).

CREATE TABLE IF NOT EXISTS imovel_duplicata_suspeita (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imovel_novo_id        UUID NOT NULL REFERENCES imovel(id) ON DELETE CASCADE,
  imovel_existente_id   UUID NOT NULL REFERENCES imovel(id) ON DELETE CASCADE,
  corretor_novo_id      UUID NOT NULL REFERENCES corretor(id),
  corretor_existente_id UUID NOT NULL REFERENCES corretor(id),
  motivo                TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente', 'revisada')),
  resolucao_nota        TEXT,
  revisado_por          UUID REFERENCES usuario_equipe(id),
  revisado_em           TIMESTAMPTZ,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (imovel_novo_id, imovel_existente_id)
);

CREATE INDEX IF NOT EXISTS idx_dupsuspeita_status ON imovel_duplicata_suspeita (status, criado_em DESC);
