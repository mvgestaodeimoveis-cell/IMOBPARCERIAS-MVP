import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export function hashPassword(senha: string): Promise<string> {
  return bcrypt.hash(senha, ROUNDS);
}

export function verifyPassword(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}
