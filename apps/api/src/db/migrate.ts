import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pool } from './pool';

const MIGRATIONS_DIR = join(__dirname, '..', '..', 'migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      nome       TEXT PRIMARY KEY,
      aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function appliedMigrations(): Promise<Set<string>> {
  const { rows } = await pool.query<{ nome: string }>('SELECT nome FROM schema_migrations');
  return new Set(rows.map((r) => r.nome));
}

async function run() {
  await ensureMigrationsTable();
  const applied = await appliedMigrations();

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (nome) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`✔ aplicada: ${file}`);
      count++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`✖ falha em ${file}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(count === 0 ? 'Nenhuma migration pendente.' : `${count} migration(s) aplicada(s).`);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
