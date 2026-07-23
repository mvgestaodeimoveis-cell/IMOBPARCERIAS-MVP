import Link from 'next/link';
import { Brandmark } from './Brandmark';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <Link href="/" className="brand-link" aria-label="Início — Imob Parcerias">
          <Brandmark />
        </Link>
        <nav className="foot-links" aria-label="Rodapé">
          <Link href="/como-instalar">Instalar o app</Link>
          <Link href="/termo">Termo de Uso</Link>
          <Link href="/politica-privacidade">Política de Privacidade</Link>
        </nav>
        <p className="foot-copy">
          © {new Date().getFullYear()} Imob Parcerias — Salvador, Região Metropolitana e Linha Verde.
        </p>
      </div>
    </footer>
  );
}
