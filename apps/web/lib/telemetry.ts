// Envia erros do navegador para o backend registrar nos logs (observabilidade).
// Best-effort: nunca lança e nunca atrapalha o fluxo do usuário.

export function reportarErro(
  contexto: string,
  err: unknown,
  extra?: Record<string, unknown>,
): void {
  try {
    const mensagem = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const corpo = JSON.stringify({
      contexto,
      mensagem,
      stack,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      extra,
    });
    // sendBeacon sobrevive à navegação/reload; fetch é o fallback.
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([corpo], { type: 'application/json' });
      navigator.sendBeacon('/api/v1/telemetry', blob);
    } else {
      void fetch('/api/v1/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: corpo,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* observabilidade nunca pode quebrar o app */
  }
}

let instalado = false;

/** Captura erros globais não tratados (uma vez por sessão). */
export function instalarCapturaGlobal(): void {
  if (instalado || typeof window === 'undefined') return;
  instalado = true;
  window.addEventListener('error', (e) => {
    reportarErro('window.onerror', e.error ?? e.message, {
      arquivo: e.filename,
      linha: e.lineno,
      coluna: e.colno,
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    reportarErro('unhandledrejection', e.reason);
  });
}
