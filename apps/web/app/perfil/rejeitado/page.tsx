'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { clearSession, getAccessToken } from '@/lib/auth';
import { contatoEmail, whatsappLink } from '@/lib/contato';
import { Brandmark } from '@/components/Brandmark';

interface Me {
  nome: string;
  status: string;
  motivo_rejeicao: string | null;
}

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
            Se acredita que houve um engano, fale com a nossa equipe pelo e-mail{' '}
            <a href={`mailto:${contatoEmail}`}>{contatoEmail}</a>.
          </p>
          {(() => {
            const wpp = whatsappLink('Olá! Preciso de ajuda com meu cadastro na Imob Parcerias.');
            return wpp ? (
              <a
                className="btn btn-emerald"
                style={{ marginTop: '0.5rem' }}
                href={wpp}
                target="_blank"
                rel="noopener noreferrer"
              >
                Falar no WhatsApp
              </a>
            ) : null;
          })()}
          <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={sair}>
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
