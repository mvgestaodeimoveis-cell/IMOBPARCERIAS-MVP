-- ============================================================================
--  Imob Parcerias — Diagnóstico de cadastros DUPLICADOS de corretores
-- ----------------------------------------------------------------------------
--  Todas as consultas abaixo são SOMENTE LEITURA (nada é alterado).
--  Objetivo: encontrar a mesma pessoa cadastrada mais de uma vez (ex.: um
--  cadastro completo + um incompleto criado com outro e-mail).
--
--  Como rodar:
--    psql "$DATABASE_URL" -f apps/api/scripts/duplicados.sql
--  (ou cole cada bloco no seu cliente SQL do Postgres)
--
--  A remoção NÃO é feita aqui. Veja o bloco 4 (no fim) para arquivar com
--  segurança — de preferência pelo painel Admin → Corretores → 🗑️ Excluir.
-- ============================================================================


-- ============================================================================
-- 1) DUPLICADOS POR WHATSAPP  (o caso mais comum — mesma pessoa, e-mails diferentes)
--    Compara apenas os dígitos do número, então (71) 99999-8888 == 71999998888.
--    A coluna "sugestao" é só uma dica: quem decide o que manter é você.
-- ============================================================================
WITH base AS (
  SELECT
    c.id,
    c.nome,
    c.email,
    c.creci,
    c.status,
    c.whatsapp,
    regexp_replace(COALESCE(c.whatsapp, ''), '[^0-9]', '', 'g') AS whats,
    c.criado_em,
    c.ultimo_acesso_em,
    (SELECT count(*) FROM imovel i
       WHERE i.corretor_id = c.id AND i.status <> 'inativo') AS imoveis
  FROM corretor c
  WHERE c.excluido_em IS NULL
    AND length(regexp_replace(COALESCE(c.whatsapp, ''), '[^0-9]', '', 'g')) >= 10
),
grupos AS (
  SELECT whats FROM base GROUP BY whats HAVING count(*) > 1
)
SELECT
  b.whats                                       AS whatsapp_digitos,
  b.nome,
  b.email,
  b.creci,
  b.status,
  b.imoveis,
  to_char(b.criado_em, 'DD/MM/YYYY HH24:MI')    AS criado_em,
  to_char(b.ultimo_acesso_em, 'DD/MM/YYYY HH24:MI') AS ultimo_acesso,
  b.id,
  CASE
    WHEN b.status = 'ativo' OR b.imoveis > 0 THEN 'MANTER (principal)'
    WHEN b.status = 'cadastro_incompleto'    THEN 'arquivar? (incompleto)'
    ELSE 'revisar'
  END                                           AS sugestao
FROM base b
JOIN grupos g ON g.whats = b.whats
ORDER BY b.whats, (b.status = 'ativo') DESC, b.imoveis DESC, b.criado_em;


-- ============================================================================
-- 2) DUPLICADOS POR CRECI  (normalizado: sem espaços/símbolos e em MAIÚSCULAS)
--    O CRECI tem restrição de unicidade, mas variações de digitação podem
--    escapar. Aqui aparecem eventuais colisões que passaram.
-- ============================================================================
WITH base AS (
  SELECT
    id, nome, email, status, creci, criado_em,
    upper(regexp_replace(COALESCE(creci, ''), '[^A-Za-z0-9]', '', 'g')) AS creci_norm
  FROM corretor
  WHERE excluido_em IS NULL
    AND COALESCE(creci, '') <> ''
),
grupos AS (
  SELECT creci_norm FROM base GROUP BY creci_norm HAVING count(*) > 1
)
SELECT
  b.creci_norm,
  b.nome,
  b.email,
  b.creci,
  b.status,
  to_char(b.criado_em, 'DD/MM/YYYY HH24:MI') AS criado_em,
  b.id
FROM base b
JOIN grupos g ON g.creci_norm = b.creci_norm
ORDER BY b.creci_norm, b.criado_em;


-- ============================================================================
-- 3) POSSÍVEIS DUPLICADOS POR NOME  (mesmo nome, cadastros diferentes)
--    Útil para achar o par "1 completo + 1 incompleto" quando a pessoa usou
--    e-mails diferentes e ainda não tinha WhatsApp salvo no cadastro antigo.
--    Pode ter homônimos — confira e-mail/WhatsApp antes de arquivar.
-- ============================================================================
WITH base AS (
  SELECT
    id, nome, email, whatsapp, creci, status, criado_em,
    lower(trim(nome)) AS nome_norm
  FROM corretor
  WHERE excluido_em IS NULL
),
grupos AS (
  SELECT nome_norm FROM base GROUP BY nome_norm HAVING count(*) > 1
)
SELECT
  b.nome,
  b.email,
  b.whatsapp,
  b.creci,
  b.status,
  to_char(b.criado_em, 'DD/MM/YYYY HH24:MI') AS criado_em,
  b.id
FROM base b
JOIN grupos g ON g.nome_norm = b.nome_norm
ORDER BY b.nome_norm, b.criado_em;


-- ============================================================================
-- 4) COMO REMOVER UM DUPLICADO  (mantido comentado de propósito)
-- ----------------------------------------------------------------------------
--  RECOMENDADO: painel Admin → Corretores → botão 🗑️ (Excluir) no registro
--  errado. É reversível, "solta" o e-mail/CRECI para reuso e inativa os
--  imóveis do corretor — tudo numa transação segura.
--
--  Se preferir pelo banco, arquive SOMENTE o registro incompleto/errado
--  (troque o UUID). Os comandos abaixo replicam exatamente o que o painel faz:
--
--  BEGIN;
--    UPDATE corretor
--       SET excluido_em = now(), atualizado_em = now(),
--           email = 'excluido:' || id || ':' || email,
--           creci = 'excluido:' || id || ':' || creci
--     WHERE id = 'COLE-O-UUID-DO-DUPLICADO'
--       AND excluido_em IS NULL;
--
--    UPDATE imovel
--       SET status = 'inativo', atualizado_em = now(),
--           exclusividade_status = 'nao', exclusividade_vencimento = NULL
--     WHERE corretor_id = 'COLE-O-UUID-DO-DUPLICADO';
--  COMMIT;
--
--  Dica: rode os SELECTs (blocos 1 a 3) de novo depois para confirmar que o
--  duplicado saiu da lista.
-- ============================================================================
