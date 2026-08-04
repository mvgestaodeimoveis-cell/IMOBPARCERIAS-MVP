'use client';

import { useEffect } from 'react';

/**
 * Registra o service worker (/sw.js). É ele que torna o app "instalável" na tela do
 * celular — sem um service worker ativo, o Chrome no Android não mostra o convite de
 * instalação. O registro é best-effort: se falhar, o app continua funcionando normal.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const registrar = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* best-effort — não bloqueia o app */
      });
    };
    if (document.readyState === 'complete') {
      registrar();
      return;
    }
    window.addEventListener('load', registrar, { once: true });
    return () => window.removeEventListener('load', registrar);
  }, []);

  return null;
}
