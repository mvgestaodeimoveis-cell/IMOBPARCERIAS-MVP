'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Brandmark } from './Brandmark';
import { clearSession } from '@/lib/auth';

export type AppTab = 'inicio' | 'painel' | 'conversas' | 'parcerias';

const NAV: { key: AppTab; label: string; href: string }[] = [
  { key: 'inicio', label: 'Início', href: '/vitrine' },
  { key: 'painel', label: 'Painel', href: '/painel' },
  { key: 'conversas', label: 'Chat', href: '/conversas' },
  { key: 'parcerias', label: 'Parcerias', href: '/parcerias' },
];

interface AppHeaderProps {
  /** Aba ativa na navegação principal. Omita para a variante com botão "voltar". */
  active?: AppTab;
  /** Exibe um contador ao lado de "Parcerias" (ex.: solicitações pendentes). */
  parceriasBadge?: number;
  /** Exibe um contador ao lado de "Chat" (mensagens não lidas). */
  conversasBadge?: number;
  /** Variante de página de detalhe: mostra um link de voltar no lugar da navegação. */
  back?: { href: string; label: string };
}

export function AppHeader({ active, parceriasBadge, conversasBadge, back }: AppHeaderProps) {
  const router = useRouter();
  const [instalavel, setInstalavel] = useState(false);

  // Mostra o atalho "Instalar" só quando o app ainda não está na tela (não é standalone).
  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalavel(!standalone);
  }, []);

  function sair() {
    clearSession();
    router.replace('/login');
  }

  return (
    <header className="topbar">
      <Brandmark />

      {back ? (
        <Link href={back.href} className="auth-back">
          <span aria-hidden>←</span> {back.label}
        </Link>
      ) : (
        <>
          <nav className="desktop-nav">
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={active === item.key ? 'active' : ''}
                aria-current={active === item.key ? 'page' : undefined}
              >
                {item.label}
                {item.key === 'parcerias' && parceriasBadge ? ` (${parceriasBadge})` : ''}
                {item.key === 'conversas' && conversasBadge ? ` (${conversasBadge})` : ''}
              </Link>
            ))}
          </nav>
          {instalavel && (
            <Link
              href="/como-instalar"
              className="btn btn-ghost topbar-sair"
              title="Instalar o app na tela do celular"
            >
              📲 App
            </Link>
          )}
          <button className="btn btn-ghost topbar-sair" onClick={sair}>
            Sair
          </button>
        </>
      )}
    </header>
  );
}
