'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { Brandmark } from '@/components/Brandmark';

interface PoliticaResponse {
  versao: string;
  texto: string;
}

export default function PoliticaPrivacidadePage() {
  const [politica, setPolitica] = useState<PoliticaResponse | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    apiFetch<PoliticaResponse>('/termo/privacidade')
      .then(setPolitica)
      .catch(() => setPolitica(null))
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
        <h1 style={{ fontSize: '1.5rem' }}>Política de Privacidade</h1>
        {carregando ? (
          <p className="muted">Carregando...</p>
        ) : politica ? (
          <>
            <p className="muted" style={{ marginBottom: '1rem' }}>Versão {politica.versao}</p>
            <div className="card" style={{ maxWidth: '100%', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {politica.texto}
            </div>
          </>
        ) : (
          <div className="banner banner-error">Não foi possível carregar a Política de Privacidade.</div>
        )}
      </div>
    </div>
  );
}
