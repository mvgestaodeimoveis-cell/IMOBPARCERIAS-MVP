import { pool } from './pool';
import { hashPassword } from '../lib/password';

/**
 * Cria (ou atualiza) um usuário da equipe (admin) a partir de variáveis de ambiente.
 * Uso: ADMIN_NOME="..." ADMIN_EMAIL="..." ADMIN_SENHA="..." npm run seed:admin
 */
async function run() {
  const nome = process.env.ADMIN_NOME;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.ADMIN_SENHA;

  if (!nome || !email || !senha) {
    console.error('Defina ADMIN_NOME, ADMIN_EMAIL e ADMIN_SENHA.');
    process.exit(1);
  }

  const senhaHash = await hashPassword(senha);
  await pool.query(
    `INSERT INTO usuario_equipe (nome, email, senha_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome, senha_hash = EXCLUDED.senha_hash`,
    [nome, email, senhaHash],
  );

  console.log(`✔ Admin pronto: ${email}`);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
