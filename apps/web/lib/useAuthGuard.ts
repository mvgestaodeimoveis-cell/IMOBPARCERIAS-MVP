'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/auth';

/**
 * Guarda de autenticação para páginas fora dos route groups com layout próprio.
 * Retorna o token atual (ou null) e redireciona para `redirectTo` quando ausente.
 *
 * Uso:
 *   const token = useAuthGuard();
 *   useEffect(() => { if (!token) return; apiFetch(..., { token }); }, [token]);
 */
export function useAuthGuard(redirectTo = '/login'): string | null {
  const router = useRouter();
  const token = getAccessToken();

  useEffect(() => {
    if (!token) router.replace(redirectTo);
  }, [token, router, redirectTo]);

  return token;
}
