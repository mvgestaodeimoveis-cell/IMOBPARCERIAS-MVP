'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { AppHeader, type AppTab } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';

/**
 * Rotas de "aba" que compartilham o shell do app (frame + header + navegação inferior).
 * As demais rotas do grupo (detalhe de parceria, chat) renderizam o próprio shell.
 */
const TABS: { path: string; tab: AppTab }[] = [
  { path: '/painel', tab: 'painel' },
  { path: '/parcerias', tab: 'parcerias' },
  { path: '/conversas', tab: 'conversas' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendentes, setPendentes] = useState(0);
  // null = verificando; false = sem sessão (redirecionando); true = liberado.
  const [autorizado, setAutorizado] = useState<boolean | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setAutorizado(false);
      router.replace('/login');
      return;
    }
    setAutorizado(true);
    apiFetch<{ data: { status: string }[] }>('/parcerias/recebidas', { token })
      .then((res) => setPendentes(res.data.filter((p) => p.status === 'solicitada').length))
      .catch(() => setPendentes(0));
  }, [router]);

  // Enquanto não confirmar a sessão, NÃO renderiza o conteúdo protegido
  // (evita expor o painel antes do redirecionamento para o login).
  if (!autorizado) {
    return (
      <div className="frame frame-app">
        <div className="screen">
          <p className="muted" style={{ padding: '2rem 0', textAlign: 'center' }}>Carregando…</p>
        </div>
      </div>
    );
  }

  const tab = TABS.find((t) => t.path === pathname);

  // Detalhe de parceria e chat renderizam o próprio layout de tela cheia.
  if (!tab) return <>{children}</>;

  return (
    <div className="frame frame-app">
      <AppHeader active={tab.tab} parceriasBadge={pendentes} />
      <div className="screen has-bottomnav">{children}</div>
      <BottomNav active={tab.tab} />
    </div>
  );
}
