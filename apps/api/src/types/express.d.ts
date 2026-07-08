export type UserRole = 'corretor' | 'equipe';

export interface AuthUser {
  id: string;
  role: UserRole;
  status?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
