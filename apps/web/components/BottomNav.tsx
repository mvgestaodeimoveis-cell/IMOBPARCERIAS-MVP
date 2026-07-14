'use client';

import Link from 'next/link';

type Tab = 'inicio' | 'vitrine' | 'novo' | 'parcerias' | 'conversas';

const ICONS: Record<Tab, React.ReactNode> = {
  inicio: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  ),
  vitrine: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l1.5-4.5h15L21 9" />
      <path d="M4 9v11h16V9" />
      <path d="M9 20v-6h6v6" />
    </svg>
  ),
  novo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  parcerias: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7h11l-3-3" />
      <path d="M17 17H6l3 3" />
    </svg>
  ),
  conversas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 1 1 21 11.5z" />
    </svg>
  ),
};

const ITEMS: { key: Tab; label: string; href: string }[] = [
  { key: 'inicio', label: 'Início', href: '/painel' },
  { key: 'vitrine', label: 'Vitrine', href: '/vitrine' },
  { key: 'novo', label: 'Anunciar', href: '/imoveis/novo' },
  { key: 'conversas', label: 'Chat', href: '/conversas' },
  { key: 'parcerias', label: 'Parcerias', href: '/parcerias' },
];

export function BottomNav({ active = 'inicio' }: { active?: Tab }) {
  return (
    <nav className="bottomnav" aria-label="Navegação principal">
      {ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={active === item.key ? 'active' : ''}
          aria-current={active === item.key ? 'page' : undefined}
        >
          {ICONS[item.key]}
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
