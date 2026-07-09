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
import { badRequest, conflict, notFound, unauthorized } from '../../lib/errors';
import { sendEmail } from '../../lib/email';
import {
  emailBoasVindas,
  emailConfirmacao,
  emailRecuperacaoSenha,
} from '../../lib/email-templates';
import type { UserRole } from '../../types/express';
import type { CompletarCadastroInput, LoginInput, RegistroInput } from './auth.schemas';

export interface CorretorSafe {
  id: string;
  nome: string;
  email: string;
  creci: string | null;
  whatsapp: string | null;
  cidade: string | null;
  imobiliaria: string | null;
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

/** Etapa 1 — cria o corretor como lead (cadastro_incompleto) e já autentica. */
export async function iniciarCadastro(input: RegistroInput) {
  const dupe = await query<{ email: string }>('SELECT email FROM corretor WHERE email = $1', [
    input.email,
  ]);
  if (dupe.rowCount) {
    throw conflict('Cadastro já existente.', { email: 'Este e-mail já está cadastrado.' });
  }

  const senhaHash = await hashPassword(input.senha);
  const inserted = await query<{
    id: string;
    nome: string;
    email: string;
    status: string;
    papel: string;
  }>(
    `INSERT INTO corretor (nome, email, senha_hash, papel, status)
     VALUES ($1, $2, $3, 'ambos', 'cadastro_incompleto')
     RETURNING id, nome, email, status, papel`,
    [input.nome, input.email, senhaHash],
  );
  const corretor = inserted.rows[0];
  await enviarConfirmacaoEmail(corretor.id, corretor.nome, corretor.email);
  const tokens = await issueTokens(corretor.id, 'corretor', corretor.status);
  return { ...tokens, corretor };
}

/** Gera token de confirmação de e-mail e envia o e-mail de confirmação. */
async function enviarConfirmacaoEmail(corretorId: string, nome: string, email: string): Promise<void> {
  const { value, hash } = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + parseDurationMs('2d'));
  await query(
    `INSERT INTO email_verificacao_token (corretor_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [corretorId, hash, expiresAt],
  );
  const url = `${env.APP_WEB_URL}/confirmar-email?token=${value}`;
  const { subject, html } = emailConfirmacao(nome, url);
  await sendEmail({ to: email, subject, html });
}

/** Confirma o e-mail do corretor a partir do token e envia o e-mail de boas-vindas. */
export async function confirmarEmail(token: string) {
  const hash = hashOpaqueToken(token);
  const { rows } = await query<{ id: string; corretor_id: string }>(
    `SELECT id, corretor_id FROM email_verificacao_token
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [hash],
  );
  const registro = rows[0];
  if (!registro) throw badRequest('Link de confirmação inválido ou expirado.');

  const cr = await query<{ nome: string; email: string; email_verificado_em: string | null }>(
    'SELECT nome, email, email_verificado_em FROM corretor WHERE id = $1',
    [registro.corretor_id],
  );
  const corretor = cr.rows[0];
  if (!corretor) throw notFound('Corretor não encontrado.');

  await query('UPDATE email_verificacao_token SET used_at = now() WHERE id = $1', [registro.id]);

  if (!corretor.email_verificado_em) {
    await query('UPDATE corretor SET email_verificado_em = now() WHERE id = $1', [
      registro.corretor_id,
    ]);
    const { subject, html } = emailBoasVindas(corretor.nome, `${env.APP_WEB_URL}/login`);
    await sendEmail({ to: corretor.email, subject, html });
  }

  return { verificado: true };
}

/** Etapa 2 — completa o cadastro do lead e registra o aceite do Termo. */
export async function completarCadastro(
  corretorId: string,
  input: CompletarCadastroInput,
  ip: string,
  userAgent: string,
) {
  const atual = await query<{ status: string }>('SELECT status FROM corretor WHERE id = $1', [
    corretorId,
  ]);
  if (!atual.rows[0]) throw notFound('Corretor não encontrado.');
  if (atual.rows[0].status !== 'cadastro_incompleto') {
    throw conflict('Cadastro já concluído.');
  }

  const dupe = await query<{ id: string }>(
    'SELECT id FROM corretor WHERE creci = $1 AND id <> $2',
    [input.creci, corretorId],
  );
  if (dupe.rowCount) {
    throw conflict('CRECI já cadastrado.', { creci: 'Este CRECI já está cadastrado.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE corretor
       SET whatsapp = $2, cidade = $3, creci = $4, imobiliaria = $5,
           status = 'verificacao_pendente', atualizado_em = now()
       WHERE id = $1`,
      [corretorId, input.whatsapp, input.cidade, input.creci, input.imobiliaria],
    );
    await client.query(
      `INSERT INTO termo_aceite (corretor_id, versao_termo, ip, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [corretorId, input.versao_termo, ip, userAgent],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { id: corretorId, status: 'verificacao_pendente' as const };
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
    `SELECT id, nome, email, creci, whatsapp, cidade, imobiliaria, papel, status, motivo_rejeicao, criado_em
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
  const { subject, html } = emailRecuperacaoSenha(corretor.nome, link);
  await sendEmail({ to: email, subject, html });
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
