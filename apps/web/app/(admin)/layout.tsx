'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAccessToken, getRole } from '@/lib/auth';
import { AdminHeader } from '@/components/AdminHeader';

const NAV: { href: string; label: string }[] = [
  { href: '/admin/dashboard', label: 'Painel' },
  { href: '/admin/corretores', label: 'Corretores' },
  { href: '/admin/imoveis', label: 'Imóveis' },
  { href: '/admin/importacoes', label: 'Importações' },
  { href: '/admin/parcerias', label: 'Parcerias' },
  { href: '/admin/conversas', label: 'Conversas' },
  { href: '/admin/denuncias', label: 'Denúncias' },
  { href: '/admin/exclusividades', label: 'Exclusividades' },
  { href: '/admin/pagamentos', label: 'Pagamentos' },
  { href: '/admin/equipe', label: 'Administradores' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [autorizado, setAutorizado] = useState<boolean | null>(null);

  useEffect(() => {
    if (pathname === '/admin/login') return;
    const token = getAccessToken();
    if (!token || getRole() !== 'equipe') {
      setAutorizado(false);
      router.replace('/admin/login');
      return;
    }
    setAutorizado(true);
  }, [router, pathname]);

  // A tela de login usa o próprio layout (sem shell autenticado).
  if (pathname === '/admin/login') return <>{children}</>;

  // Não expõe o painel da equipe antes de confirmar a sessão.
  if (!autorizado) {
    return (
      <div className="frame frame-app">
        <div className="screen">
          <p className="muted" style={{ padding: '2rem 0', textAlign: 'center' }}>Carregando…</p>
        </div>
      </div>
    );
  }

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
