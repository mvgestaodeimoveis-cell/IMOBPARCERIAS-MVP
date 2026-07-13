// Login social com Google. Habilitado apenas quando o backend está configurado
// e a flag pública está ligada (NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED=true).

export const googleLoginEnabled =
  (process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED || '').toLowerCase() === 'true';

/** Redireciona o navegador para iniciar o fluxo OAuth (via BFF, mesma origem). */
export function startGoogleLogin(intent: 'login' | 'cadastro' = 'login'): void {
  window.location.href = `/api/v1/auth/google?intent=${intent}`;
}
