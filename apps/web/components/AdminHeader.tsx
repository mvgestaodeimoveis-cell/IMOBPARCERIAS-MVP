'use client';

import { useRouter } from 'next/navigation';
import { Brandmark } from './Brandmark';
import { clearSession } from '@/lib/auth';

export function AdminHeader() {
  const router = useRouter();

  function sair() {
    clearSession();
    router.replace('/admin/login');
  }

  return (
    <header className="topbar">
      <span className="brand-link">
        <Brandmark />
      </span>
      <div className="admin-topbar-right">
        <span className="admin-badge">Equipe</span>
        <button className="btn btn-ghost topbar-sair" onClick={sair}>
          Sair
        </button>
      </div>
    </header>
  );
}
