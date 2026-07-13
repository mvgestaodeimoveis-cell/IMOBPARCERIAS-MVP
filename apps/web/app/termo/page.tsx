'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { Brandmark } from '@/components/Brandmark';

interface TermoResponse {
  versao: string;
  texto: string;
}

export default function TermoPage() {
  const [termo, setTermo] = useState<TermoResponse | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    apiFetch<TermoResponse>('/termo/atual')
      .then(setTermo)
      .catch(() => setTermo(null))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div className="frame frame-app">
      <header className="topbar">
        <Link href="/" className="brand-link">
          <Brandmark />
        </Link>
      </header>
      <div className="screen">
        <h1 style={{ fontSize: '1.5rem' }}>Termo de Uso</h1>
        {carregando ? (
          <p className="muted">Carregando...</p>
        ) : termo ? (
          <>
            <p className="muted" style={{ marginBottom: '1rem' }}>Versão {termo.versao}</p>
            <div className="card" style={{ maxWidth: '100%', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {termo.texto}
            </div>
          </>
        ) : (
          <div className="banner banner-error">Não foi possível carregar o Termo de Uso.</div>
        )}
      </div>
    </div>
  );
}
