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

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    apiFetch<{ data: { status: string }[] }>('/parcerias/recebidas', { token })
      .then((res) => setPendentes(res.data.filter((p) => p.status === 'solicitada').length))
      .catch(() => setPendentes(0));
  }, [router]);

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
