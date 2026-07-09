'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { clearSession, getAccessToken } from '@/lib/auth';
import { Brandmark } from '@/components/Brandmark';

interface Me {
  nome: string;
  status: string;
  motivo_rejeicao: string | null;
}

// TODO: substituir pelo contato oficial da equipe (definição pendente C4).
const CONTATO_EQUIPE = 'contato@imobparcerias.com.br';

export default function PerfilRejeitadoPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    apiFetch<Me>('/corretores/me', { token })
      .then(setMe)
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  function sair() {
    clearSession();
    router.replace('/login');
  }

  if (loading) {
    return (
      <div className="frame frame-app">
        <header className="topbar">
          <Link href="/" className="brand-link">
            <Brandmark />
          </Link>
        </header>
        <div className="screen center muted">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="frame frame-app">
      <header className="topbar">
        <Link href="/" className="brand-link">
          <Brandmark />
        </Link>
      </header>
      <div
        className="screen"
        style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
      >
        <div className="card" style={{ width: '100%', maxWidth: 460, margin: '0 auto' }}>
          <span className="eyebrow" style={{ textAlign: 'left', color: 'var(--error)' }}>
            Não aprovado
          </span>
          <h2>Cadastro não aprovado</h2>
          <div className="banner banner-error">
            {me?.motivo_rejeicao ?? 'Seu cadastro não pôde ser aprovado no momento.'}
          </div>
          <p className="muted">
            Se acredita que houve um engano, entre em contato com a equipe pelo e-mail{' '}
            <a href={`mailto:${CONTATO_EQUIPE}`}>{CONTATO_EQUIPE}</a>.
          </p>
          <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={sair}>
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
