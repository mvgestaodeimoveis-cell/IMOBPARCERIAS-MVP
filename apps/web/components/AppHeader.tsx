'use client';

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
  /** Variante de página de detalhe: mostra um link de voltar no lugar da navegação. */
  back?: { href: string; label: string };
}

export function AppHeader({ active, parceriasBadge, back }: AppHeaderProps) {
  const router = useRouter();

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
              </Link>
            ))}
          </nav>
          <button className="btn btn-ghost topbar-sair" onClick={sair}>
            Sair
          </button>
        </>
      )}
    </header>
  );
}
