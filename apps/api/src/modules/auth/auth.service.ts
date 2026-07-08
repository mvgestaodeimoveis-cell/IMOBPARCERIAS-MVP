import { pool, query } from '../../db/pool';
import { env } from '../../config/env';
import { hashPassword, verifyPassword } from '../../lib/password';
import {
  generateOpaqueToken,
  generateRefreshToken,
  hashOpaqueToken,
  hashRefreshToken,
  signAccessToken,
} from '../../lib/jwt';
import { badRequest, conflict, unauthorized } from '../../lib/errors';
import { sendEmail } from '../../lib/email';
import type { UserRole } from '../../types/express';
import type { LoginInput, RegistroInput } from './auth.schemas';

export interface CorretorSafe {
  id: string;
  nome: string;
  email: string;
  creci: string;
  whatsapp: string;
  cidade: string;
  papel: string;
  status: string;
  motivo_rejeicao: string | null;
  criado_em: string;
}

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

function parseDurationMs(input: string): number {
  const match = /^(\d+)([smhd])$/.exec(input.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const factor = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] ?? 86_400_000;
  return value * factor;
}

async function issueTokens(subjectId: string, role: UserRole, status?: string): Promise<TokenPair> {
  const access_token = signAccessToken({ id: subjectId, role, status });
  const { value, hash } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + parseDurationMs(env.REFRESH_TOKEN_EXPIRES_IN));

  await query(
    `INSERT INTO refresh_token (token_hash, subject_id, role, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [hash, subjectId, role, expiresAt],
  );

  return { access_token, refresh_token: value };
}

export async function registrarCorretor(
  input: RegistroInput,
  ip: string,
  userAgent: string,
): Promise<Pick<CorretorSafe, 'id' | 'nome' | 'email' | 'status' | 'papel'>> {
  const dupe = await query<{ email: string; creci: string }>(
    'SELECT email, creci FROM corretor WHERE email = $1 OR creci = $2',
    [input.email, input.creci],
  );
  if (dupe.rowCount) {
    const row = dupe.rows[0];
    const fields: Record<string, string> = {};
    if (row.email === input.email) fields.email = 'Este e-mail já está cadastrado.';
    if (row.creci === input.creci) fields.creci = 'Este CRECI já está cadastrado.';
    throw conflict('Cadastro já existente.', fields);
  }

  const senhaHash = await hashPassword(input.senha);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query<{
      id: string;
      nome: string;
      email: string;
      status: string;
      papel: string;
    }>(
      `INSERT INTO corretor (nome, email, senha_hash, creci, whatsapp, cidade, papel)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nome, email, status, papel`,
      [input.nome, input.email, senhaHash, input.creci, input.whatsapp, input.cidade, input.papel],
    );
    const corretor = inserted.rows[0];

    await client.query(
      `INSERT INTO termo_aceite (corretor_id, versao_termo, ip, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [corretor.id, input.versao_termo, ip, userAgent],
    );

    await client.query('COMMIT');
    return corretor;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function loginCorretor(input: LoginInput) {
  const { rows } = await query<CorretorSafe & { senha_hash: string }>(
    'SELECT * FROM corretor WHERE email = $1',
    [input.email],
  );
  const corretor = rows[0];
  if (!corretor || !(await verifyPassword(input.senha, corretor.senha_hash))) {
    throw unauthorized('E-mail ou senha inválidos.');
  }

  const tokens = await issueTokens(corretor.id, 'corretor', corretor.status);
  return {
    ...tokens,
    corretor: {
      id: corretor.id,
      nome: corretor.nome,
      status: corretor.status,
      papel: corretor.papel,
    },
  };
}

export async function loginEquipe(input: LoginInput) {
  const { rows } = await query<{ id: string; nome: string; senha_hash: string }>(
    'SELECT id, nome, senha_hash FROM usuario_equipe WHERE email = $1',
    [input.email],
  );
  const equipe = rows[0];
  if (!equipe || !(await verifyPassword(input.senha, equipe.senha_hash))) {
    throw unauthorized('E-mail ou senha inválidos.');
  }

  const tokens = await issueTokens(equipe.id, 'equipe');
  return { ...tokens, equipe: { id: equipe.id, nome: equipe.nome } };
}

export async function refreshTokens(refreshToken: string) {
  const hash = hashRefreshToken(refreshToken);
  const { rows } = await query<{ subject_id: string; role: UserRole }>(
    `SELECT subject_id, role FROM refresh_token
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [hash],
  );
  const stored = rows[0];
  if (!stored) throw unauthorized('Sessão inválida ou expirada.');

  await query('UPDATE refresh_token SET revoked_at = now() WHERE token_hash = $1', [hash]);

  let status: string | undefined;
  if (stored.role === 'corretor') {
    const res = await query<{ status: string }>('SELECT status FROM corretor WHERE id = $1', [
      stored.subject_id,
    ]);
    status = res.rows[0]?.status;
  }

  return issueTokens(stored.subject_id, stored.role, status);
}

export async function logout(refreshToken: string): Promise<void> {
  const hash = hashRefreshToken(refreshToken);
  await query('UPDATE refresh_token SET revoked_at = now() WHERE token_hash = $1', [hash]);
}

export async function getCorretorById(id: string): Promise<CorretorSafe | null> {
  const { rows } = await query<CorretorSafe>(
    `SELECT id, nome, email, creci, whatsapp, cidade, papel, status, motivo_rejeicao, criado_em
     FROM corretor WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Gera token de recuperação e envia e-mail com o link.
 * Sempre resolve sem erro (não revela se o e-mail existe).
 */
export async function solicitarResetSenha(email: string): Promise<void> {
  const { rows } = await query<{ id: string; nome: string }>(
    'SELECT id, nome FROM corretor WHERE email = $1',
    [email],
  );
  const corretor = rows[0];
  if (!corretor) return;

  const { value, hash } = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + parseDurationMs(env.RESET_TOKEN_EXPIRES_IN));
  await query(
    `INSERT INTO password_reset_token (corretor_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [corretor.id, hash, expiresAt],
  );

  const link = `${env.APP_WEB_URL}/redefinir-senha?token=${value}`;
  await sendEmail({
    to: email,
    subject: 'Imob Parcerias — recuperação de senha',
    html: `<p>Olá, ${corretor.nome}.</p><p>Para redefinir sua senha, acesse: <a href="${link}">${link}</a></p><p>O link expira em breve. Se não foi você, ignore este e-mail.</p>`,
  });
}

export async function redefinirSenha(token: string, novaSenha: string): Promise<void> {
  const hash = hashOpaqueToken(token);
  const { rows } = await query<{ id: string; corretor_id: string }>(
    `SELECT id, corretor_id FROM password_reset_token
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [hash],
  );
  const reset = rows[0];
  if (!reset) throw badRequest('Link de recuperação inválido ou expirado.');

  const senhaHash = await hashPassword(novaSenha);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE corretor SET senha_hash = $2, atualizado_em = now() WHERE id = $1',
      [reset.corretor_id, senhaHash],
    );
    await client.query('UPDATE password_reset_token SET used_at = now() WHERE id = $1', [reset.id]);
    // Invalida sessões ativas do corretor.
    await client.query(
      'UPDATE refresh_token SET revoked_at = now() WHERE subject_id = $1 AND revoked_at IS NULL',
      [reset.corretor_id],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
