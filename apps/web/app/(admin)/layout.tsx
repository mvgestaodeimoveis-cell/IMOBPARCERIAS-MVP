'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAccessToken, getRole } from '@/lib/auth';
import { AdminHeader } from '@/components/AdminHeader';

const NAV: { href: string; label: string }[] = [
  { href: '/admin/dashboard', label: 'Painel' },
  { href: '/admin/corretores', label: 'Corretores' },
  { href: '/admin/imoveis', label: 'Imóveis' },
  { href: '/admin/exclusividades', label: 'Exclusividades' },
  { href: '/admin/pagamentos', label: 'Pagamentos' },
  { href: '/admin/equipe', label: 'Administradores' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/admin/login') return;
    const token = getAccessToken();
    if (!token || getRole() !== 'equipe') {
      router.replace('/admin/login');
    }
  }, [router, pathname]);

  // A tela de login usa o próprio layout (sem shell autenticado).
  if (pathname === '/admin/login') return <>{children}</>;

  return (
    <div className="frame frame-app">
      <AdminHeader />
      <nav className="admin-nav" aria-label="Navegação da equipe">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className={pathname === item.href ? 'active' : ''}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="screen">{children}</div>
    </div>
  );
}
