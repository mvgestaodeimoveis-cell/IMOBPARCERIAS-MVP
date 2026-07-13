'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { saveSession, routeForStatus } from '@/lib/auth';
import { Brandmark } from '@/components/Brandmark';

const MENSAGENS_ERRO: Record<string, string> = {
  acesso_negado: 'Você cancelou o acesso com o Google.',
  requisicao_invalida: 'Não foi possível concluir o login. Tente novamente.',
  falha_login: 'Falha ao entrar com o Google. Tente novamente.',
};

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const params = new URLSearchParams(hash);
    // Limpa o hash para não deixar tokens no histórico.
    window.history.replaceState(null, '', window.location.pathname);

    const error = params.get('error');
    if (error) {
      setErro(MENSAGENS_ERRO[error] ?? 'Não foi possível entrar com o Google.');
      return;
    }

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const status = params.get('status') ?? '';
    if (!accessToken || !refreshToken) {
      setErro('Sessão inválida. Tente novamente.');
      return;
    }

    saveSession({ accessToken, refreshToken, role: 'corretor' });
    router.replace(routeForStatus(status));
  }, [router]);

  return (
    <div className="frame frame-app">
      <header className="topbar">
        <Link href="/" className="brand-link">
          <Brandmark />
        </Link>
      </header>
      <div className="screen center">
        {erro ? (
          <div className="card" style={{ maxWidth: 420, margin: '0 auto' }}>
            <div className="banner banner-error">{erro}</div>
            <Link className="btn btn-emerald" href="/login" style={{ marginTop: '1rem' }}>
              Voltar para o login
            </Link>
          </div>
        ) : (
          <p className="muted">Entrando com o Google...</p>
        )}
      </div>
    </div>
  );
}
