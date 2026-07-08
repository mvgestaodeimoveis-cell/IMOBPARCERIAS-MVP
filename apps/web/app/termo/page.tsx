'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface TermoResponse {
  versao: string;
  texto: string;
}

export default function TermoPage() {
  const [termo, setTermo] = useState<TermoResponse | null>(null);

  useEffect(() => {
    apiFetch<TermoResponse>('/termo/atual')
      .then(setTermo)
      .catch(() => setTermo(null));
  }, []);

  return (
    <main className="container">
      <h1>Termo de Uso</h1>
      {termo ? (
        <>
          <p className="muted">Versão {termo.versao}</p>
          <div className="card" style={{ maxWidth: '100%', whiteSpace: 'pre-wrap' }}>
            {termo.texto}
          </div>
        </>
      ) : (
        <p className="muted">Não foi possível carregar o termo.</p>
      )}
    </main>
  );
}
