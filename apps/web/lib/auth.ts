'use client';

const ACCESS_KEY = 'imob.access_token';
const REFRESH_KEY = 'imob.refresh_token';
const ROLE_KEY = 'imob.role';

export type Role = 'corretor' | 'equipe';

export interface Session {
  accessToken: string;
  refreshToken: string;
  role: Role;
}

export function saveSession(session: Session): void {
  localStorage.setItem(ACCESS_KEY, session.accessToken);
  localStorage.setItem(REFRESH_KEY, session.refreshToken);
  localStorage.setItem(ROLE_KEY, session.role);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRole(): Role | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROLE_KEY) as Role | null;
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ROLE_KEY);
}

/** Rota inicial conforme o status do corretor. */
export function routeForStatus(status: string): string {
  switch (status) {
    case 'ativo':
      return '/painel';
    case 'cadastro_incompleto':
      return '/completar-cadastro';
    case 'rejeitado':
      return '/perfil/rejeitado';
    case 'suspenso':
      return '/perfil/rejeitado';
    default:
      return '/perfil/analise';
  }
}
