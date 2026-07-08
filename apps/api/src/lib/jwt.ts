import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthUser, UserRole } from '../types/express';

interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  status?: string;
}

export function signAccessToken(user: AuthUser): string {
  const payload: AccessTokenPayload = { sub: user.id, role: user.role, status: user.status };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AuthUser {
  const decoded = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
  return { id: decoded.sub, role: decoded.role, status: decoded.status };
}

/** Refresh token opaco: valor aleatório (enviado ao cliente) + hash (persistido). */
export function generateRefreshToken() {
  const value = crypto.randomBytes(48).toString('base64url');
  const hash = hashRefreshToken(value);
  return { value, hash };
}

export function hashRefreshToken(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Token opaco genérico (ex.: recuperação de senha): valor + hash. */
export function generateOpaqueToken() {
  const value = crypto.randomBytes(48).toString('base64url');
  return { value, hash: hashOpaqueToken(value) };
}

export function hashOpaqueToken(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
