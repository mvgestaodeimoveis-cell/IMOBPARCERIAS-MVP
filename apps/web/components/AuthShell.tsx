import { Brandmark } from './Brandmark';
import { LogoMark } from './LogoMark';

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-brand">
        <div className="auth-brand-lockup">
          <LogoMark size={56} />
          <h2>
            Imob<span style={{ color: 'var(--orange)' }}>Parcerias</span>
          </h2>
        </div>
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
      </aside>

      <div className="auth-main">
        <header className="topbar auth-topbar">
          <Brandmark />
          <button className="icon-btn" aria-label="Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
        </header>
        <div className="auth-body">{children}</div>
      </div>
    </div>
  );
}
