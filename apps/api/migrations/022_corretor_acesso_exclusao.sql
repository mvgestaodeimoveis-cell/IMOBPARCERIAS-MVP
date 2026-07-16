-- 022_corretor_acesso_exclusao.sql — painel da equipe:
--  * ultimo_acesso_em: registrado a cada login do corretor;
--  * excluido_em: exclusão lógica (soft delete) — corretor arquivado, reversível.

ALTER TABLE corretor
  ADD COLUMN IF NOT EXISTS ultimo_acesso_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS excluido_em      TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_corretor_excluido ON corretor(excluido_em);
