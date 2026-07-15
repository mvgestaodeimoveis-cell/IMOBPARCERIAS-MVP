'use client';

import { useEffect } from 'react';
import { instalarCapturaGlobal } from '@/lib/telemetry';

/** Registra a captura global de erros do navegador. Não renderiza nada. */
export function ErrorReporter() {
  useEffect(() => {
    instalarCapturaGlobal();
  }, []);
  return null;
}
