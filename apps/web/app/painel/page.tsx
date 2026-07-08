'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { clearSession, getAccessToken, routeForStatus } from '@/lib/auth';
import { Brandmark } from '@/components/Brandmark';
import { BottomNav } from '@/components/BottomNav';

interface Me {
  nome: string;
  papel: string;
  status: string;
}

export default function AppHomePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    apiFetch<Me>('/corretores/me', { token })
      .then((data) => {
        if (data.status !== 'ativo') {
          router.replace(routeForStatus(data.status));
          return;
        }
        setMe(data);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  function sair() {
    clearSession();
    router.replace('/login');
  }

  return (
    <div className="frame frame-app">
      <header className="topbar">
        <Brandmark />
        <nav className="desktop-nav">
          <Link href="/painel" className="active">Início</Link>
          <Link href="/painel">Demandas</Link>
          <Link href="/painel">Matches</Link>
          <Link href="/painel">Agenda</Link>
          <Link href="/painel">Feedback</Link>
        </nav>
        <button className="btn btn-ghost" style={{ width: 'auto', minHeight: 'auto', padding: '0.45rem 0.9rem' }} onClick={sair}>
          Sair
        </button>
      </header>

      <div className="screen has-bottomnav">
        <h1 style={{ fontSize: '1.5rem' }}>Olá{me ? `, ${me.nome.split(' ')[0]}` : ''}!</h1>
        <p className="muted" style={{ marginBottom: '1.25rem' }}>Seu perfil está ativo e verificado.</p>

        <div className="app-content">
          <div className="card">
            <span className="eyebrow" style={{ textAlign: 'left' }}>Em breve</span>
            <h3 style={{ textTransform: 'uppercase', fontWeight: 800 }}>Vitrine de imóveis</h3>
            <p className="muted" style={{ margin: 0 }}>
              A vitrine e o cadastro de imóveis chegam na próxima etapa (Sprint 2).
            </p>
          </div>
          <div className="card">
            <span className="eyebrow" style={{ textAlign: 'left' }}>Em breve</span>
            <h3 style={{ textTransform: 'uppercase', fontWeight: 800 }}>Matches e demandas</h3>
            <p className="muted" style={{ margin: 0 }}>
              Conexões automáticas entre seus imóveis e as demandas dos parceiros.
            </p>
          </div>
        </div>
      </div>

      <BottomNav active="inicio" />
    </div>
  );
}
