import 'dotenv/config';
import { Pool } from 'pg';

/**
 * Diagnóstico e limpeza de cadastros DUPLICADOS de corretores.
 *
 * Conecta usando a DATABASE_URL do ambiente/.env — aponte para o banco desejado
 * (inclusive o Neon). Nenhuma credencial é digitada no código: ela vem do seu .env.
 * Este script é independente do resto da API (só precisa da DATABASE_URL).
 *
 * Uso (a partir de apps/api):
 *   npm run duplicados                                  # LISTA os duplicados (não altera nada)
 *   npm run duplicados -- --arquivar <id>               # mostra o que faria (dry-run, seguro)
 *   npm run duplicados -- --arquivar <id> --sim         # ARQUIVA de fato o registro informado
 *
 * "Arquivar" replica o botão 🗑️ do painel Admin: soft-delete (excluido_em), libera
 * e-mail/CRECI para reuso e inativa os imóveis do corretor. É reversível no banco.
 * Faça isso APENAS no registro incompleto/errado — nunca no cadastro principal.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    'DATABASE_URL não definida. Aponte para o banco (ex.: a connection string do Neon):\n' +
      '  • crie apps/api/.env com:\n' +
      '      DATABASE_URL="postgresql://USUARIO:SENHA@ep-xxx.sa-east-1.aws.neon.tech/imob?sslmode=require"\n' +
      '  • ou exporte a variável no terminal antes de rodar o comando.',
  );
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  // Neon exige SSL (sslmode=require na string). rejectUnauthorized:false aceita o certificado gerenciado.
  ssl: /sslmode=require|neon\.tech/i.test(connectionString) ? { rejectUnauthorized: false } : undefined,
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const WHATS_SQL = `
  WITH base AS (
    SELECT c.id, c.nome, c.email, c.creci, c.status,
           regexp_replace(COALESCE(c.whatsapp, ''), '[^0-9]', '', 'g') AS whats,
           c.criado_em,
           (SELECT count(*)::int FROM imovel i
              WHERE i.corretor_id = c.id AND i.status <> 'inativo') AS imoveis
    FROM corretor c
    WHERE c.excluido_em IS NULL
      AND length(regexp_replace(COALESCE(c.whatsapp, ''), '[^0-9]', '', 'g')) >= 10
  ),
  grupos AS (SELECT whats FROM base GROUP BY whats HAVING count(*) > 1)
  SELECT b.whats AS whatsapp, b.nome, b.email, b.status, b.imoveis,
         to_char(b.criado_em, 'DD/MM/YYYY') AS criado, b.id,
         CASE WHEN b.status = 'ativo' OR b.imoveis > 0 THEN 'MANTER'
              WHEN b.status = 'cadastro_incompleto'    THEN 'arquivar?'
              ELSE 'revisar' END AS sugestao
  FROM base b JOIN grupos g ON g.whats = b.whats
  ORDER BY b.whats, (b.status = 'ativo') DESC, b.imoveis DESC, b.criado_em`;

const CRECI_SQL = `
  WITH base AS (
    SELECT id, nome, email, status, creci, criado_em,
           upper(regexp_replace(COALESCE(creci, ''), '[^A-Za-z0-9]', '', 'g')) AS creci_norm
    FROM corretor
    WHERE excluido_em IS NULL AND COALESCE(creci, '') <> ''
  ),
  grupos AS (SELECT creci_norm FROM base GROUP BY creci_norm HAVING count(*) > 1)
  SELECT b.creci_norm AS creci, b.nome, b.email, b.status,
         to_char(b.criado_em, 'DD/MM/YYYY') AS criado, b.id
  FROM base b JOIN grupos g ON g.creci_norm = b.creci_norm
  ORDER BY b.creci_norm, b.criado_em`;

const NOME_SQL = `
  WITH base AS (
    SELECT id, nome, email, whatsapp, status, criado_em, lower(trim(nome)) AS nome_norm
    FROM corretor
    WHERE excluido_em IS NULL
  ),
  grupos AS (SELECT nome_norm FROM base GROUP BY nome_norm HAVING count(*) > 1)
  SELECT b.nome, b.email, b.whatsapp, b.status,
         to_char(b.criado_em, 'DD/MM/YYYY') AS criado, b.id
  FROM base b JOIN grupos g ON g.nome_norm = b.nome_norm
  ORDER BY b.nome_norm, b.criado_em`;

async function listar(): Promise<void> {
  const whats = await pool.query(WHATS_SQL);
  console.log(`\n=== 1) Duplicados por WHATSAPP (${whats.rowCount} registros em grupos) ===`);
  if (whats.rowCount) console.table(whats.rows);
  else console.log('Nenhum.');

  const creci = await pool.query(CRECI_SQL);
  console.log(`\n=== 2) Duplicados por CRECI (${creci.rowCount}) ===`);
  if (creci.rowCount) console.table(creci.rows);
  else console.log('Nenhum.');

  const nome = await pool.query(NOME_SQL);
  console.log(`\n=== 3) Possíveis duplicados por NOME (${nome.rowCount}) — confira e-mail/WhatsApp ===`);
  if (nome.rowCount) console.table(nome.rows);
  else console.log('Nenhum.');

  console.log(
    '\nPara arquivar o registro incompleto/errado (copie o id da coluna "id"):\n' +
      '  npm run duplicados -- --arquivar <id>          (dry-run, mostra o alvo)\n' +
      '  npm run duplicados -- --arquivar <id> --sim    (arquiva de fato)\n',
  );
}

async function arquivar(id: string, confirmar: boolean): Promise<void> {
  if (!UUID_RE.test(id)) {
    console.error(`id inválido: "${id}". Informe o UUID exibido na coluna "id" da listagem.`);
    return;
  }
  const alvo = await pool.query<{
    id: string;
    nome: string;
    email: string;
    creci: string | null;
    status: string;
    whatsapp: string | null;
    imoveis: number;
  }>(
    `SELECT id, nome, email, creci, status, whatsapp,
            (SELECT count(*)::int FROM imovel i
               WHERE i.corretor_id = corretor.id AND i.status <> 'inativo') AS imoveis
     FROM corretor WHERE id = $1 AND excluido_em IS NULL`,
    [id],
  );
  const c = alvo.rows[0];
  if (!c) {
    console.error(`Nenhum corretor ativo com id ${id} (já arquivado ou inexistente).`);
    return;
  }

  console.log('\nAlvo do arquivamento:');
  console.table([c]);
  if (c.status === 'ativo' || c.imoveis > 0) {
    console.log('⚠️  ATENÇÃO: este parece ser um cadastro PRINCIPAL (ativo e/ou com imóveis).');
    console.log('    Confirme que é mesmo o registro incompleto antes de usar --sim.');
  }
  if (!confirmar) {
    console.log('\n[dry-run] Nada foi alterado. Para arquivar de fato, repita com --sim.\n');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE corretor
         SET excluido_em = now(), atualizado_em = now(),
             email = 'excluido:' || id || ':' || email,
             creci = 'excluido:' || id || ':' || creci
       WHERE id = $1 AND excluido_em IS NULL`,
      [id],
    );
    await client.query(
      `UPDATE imovel
         SET status = 'inativo', atualizado_em = now(),
             exclusividade_status = 'nao', exclusividade_vencimento = NULL
       WHERE corretor_id = $1`,
      [id],
    );
    await client.query('COMMIT');
    console.log(`\n✔ Corretor ${id} arquivado (e-mail/CRECI liberados; imóveis inativados).\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const arqIdx = args.indexOf('--arquivar');
  if (arqIdx >= 0) {
    await arquivar(args[arqIdx + 1] ?? '', args.includes('--sim'));
  } else {
    await listar();
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
