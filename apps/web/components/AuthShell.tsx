import Link from 'next/link';
import { Brandmark } from './Brandmark';
import { LogoMark } from './LogoMark';

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-brand">
        <Link href="/" className="auth-brand-lockup" aria-label="Ir para a home">
          <LogoMark size={56} />
          <h2>
            Imob<span style={{ color: 'var(--orange)' }}>Parcerias</span>
          </h2>
        </Link>
        <p>
          Rede exclusiva de corretores com CRECI verificado. Publique imóveis, encontre demandas e
          feche parcerias com segurança.
        </p>
        <ul>
          <li>
            <b>✓</b> Banco de imóveis exclusivo e sem duplicatas
          </li>
          <li>
            <b>✓</b> Parceiros credenciados de Salvador e região
          </li>
          <li>
            <b>✓</b> Negociação mediada e comissão protegida
          </li>
        </ul>
        <Link href="/" className="auth-back auth-back-brand">
          <span aria-hidden>←</span> Voltar para a home
        </Link>
      </aside>

      <div className="auth-main">
        <header className="topbar auth-topbar">
          <Link href="/" aria-label="Ir para a home">
            <Brandmark />
          </Link>
          <Link href="/" className="auth-back">
            <span aria-hidden>←</span> Home
          </Link>
        </header>
        <div className="auth-body">{children}</div>
      </div>
    </div>
  );
}
