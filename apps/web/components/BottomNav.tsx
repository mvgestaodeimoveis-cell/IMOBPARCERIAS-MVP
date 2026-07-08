'use client';

import Link from 'next/link';

type Tab = 'inicio' | 'demandas' | 'matches' | 'agenda' | 'feedback';

const ICONS: Record<Tab, React.ReactNode> = {
  inicio: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  ),
  demandas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  ),
  matches: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7h11l-3-3" />
      <path d="M17 17H6l3 3" />
    </svg>
  ),
  agenda: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="8" y1="3" x2="8" y2="6" />
      <line x1="16" y1="3" x2="16" y2="6" />
    </svg>
  ),
  feedback: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

const ITEMS: { key: Tab; label: string; href: string }[] = [
  { key: 'inicio', label: 'Início', href: '/painel' },
  { key: 'demandas', label: 'Demandas', href: '/painel' },
  { key: 'matches', label: 'Matches', href: '/painel' },
  { key: 'agenda', label: 'Agenda', href: '/painel' },
  { key: 'feedback', label: 'Feedback', href: '/painel' },
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
