'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brandmark } from './Brandmark';
import { isAuthenticated, getRole } from '../lib/auth';

export function Topbar() {
  const [open, setOpen] = useState(false);
  const [logado, setLogado] = useState(false);
  const [painelHref, setPainelHref] = useState('/painel');

  useEffect(() => {
    const auth = isAuthenticated();
    setLogado(auth);
    if (auth) setPainelHref(getRole() === 'equipe' ? '/admin/dashboard' : '/painel');
  }, []);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand-link" aria-label="Início — Imob Parcerias">
          <Brandmark />
        </Link>

        <nav className="nav-desktop" aria-label="Principal">
          <Link href="/vitrine">Vitrine</Link>
          <Link href="/como-funciona">Como funciona</Link>
          {logado ? (
            <Link href={painelHref} className="btn btn-emerald nav-cta">
              Meu painel
            </Link>
          ) : (
            <>
              <Link href="/login">Entrar</Link>
              <Link href="/cadastro" className="btn btn-emerald nav-cta">
                Cadastrar
              </Link>
            </>
          )}
        </nav>

        <button
          className="icon-btn nav-toggle"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          )}
        </button>

        {open && (
          <div className="nav-mobile">
            <Link href="/vitrine" onClick={() => setOpen(false)}>
              Vitrine
            </Link>
            <Link href="/como-funciona" onClick={() => setOpen(false)}>
              Como funciona
            </Link>
            {logado ? (
              <Link href={painelHref} className="btn btn-emerald" onClick={() => setOpen(false)}>
                Meu painel
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)}>
                  Entrar
                </Link>
                <Link href="/cadastro" className="btn btn-emerald" onClick={() => setOpen(false)}>
                  Cadastrar
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
