'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { clearSession, getAccessToken, routeForStatus } from '@/lib/auth';
import { Brandmark } from '@/components/Brandmark';

interface Me {
  nome: string;
  email: string;
  creci: string;
  cidade: string;
  status: string;
}

export default function PerfilAnalisePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [verificando, setVerificando] = useState(false);

  const checkStatus = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    try {
      const data = await apiFetch<Me>('/corretores/me', { token });
      if (data.status !== 'verificacao_pendente') {
        router.replace(routeForStatus(data.status));
        return;
      }
      setMe(data);
    } catch {
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkStatus();
    // Verifica automaticamente a cada 10s se o perfil foi liberado.
    const id = setInterval(checkStatus, 10000);
    return () => clearInterval(id);
  }, [checkStatus]);

  async function verificarAgora() {
    setVerificando(true);
    await checkStatus();
    setVerificando(false);
  }

  function sair() {
    clearSession();
    router.replace('/login');
  }

  if (loading) {
    return (
      <div className="frame">
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
    <div className="frame">
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
          <span className="eyebrow" style={{ textAlign: 'left', color: 'var(--warning)' }}>
            Em análise
          </span>
          <h2>Cadastro em análise</h2>
          <div className="banner banner-warning">
            Estamos verificando seu CRECI junto ao CRECI-BA. O prazo é de até{' '}
            <strong>48h úteis</strong>. Você receberá um e-mail assim que o perfil for aprovado.
          </div>
          {me && (
            <ul className="muted" style={{ lineHeight: 1.8, paddingLeft: '1.1rem' }}>
              <li>Nome: {me.nome}</li>
              <li>CRECI: {me.creci}</li>
              <li>Cidade: {me.cidade}</li>
              <li>E-mail: {me.email}</li>
            </ul>
          )}
          <button
            className="btn btn-emerald"
            style={{ marginTop: '1rem' }}
            onClick={verificarAgora}
            disabled={verificando}
          >
            {verificando ? 'Verificando...' : 'Já fui aprovado? Atualizar'}
          </button>
          <button className="btn btn-ghost" style={{ marginTop: '0.75rem' }} onClick={sair}>
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
