import Link from 'next/link';
import { Topbar } from '@/components/Topbar';
import { LogoMark } from '@/components/LogoMark';

export default function LandingPage() {
  return (
    <div className="frame frame-marketing">
      <Topbar />
      <div className="screen">
        <section className="hero">
          <LogoMark size={72} className="logo-hero" />
          <h1>
            Publique seus imóveis e aumente suas <span className="hl">vendas em parcerias.</span>
          </h1>
          <p className="sub">Salvador, Região Metropolitana e Linha Verde</p>
          <p className="tag">Focamos nas conexões, não em anúncios</p>
          <Link href="/login" className="btn btn-emerald">
            <span>
              Entrar ou cadastrar-se
              <span className="btn-sub">Exclusivo para corretores</span>
            </span>
          </Link>
        </section>

        <section className="features">
          <div className="feature">
            <span className="fi ico-green">🏠</span>
            <h3>Vitrine sem duplicatas</h3>
            <p>Imóveis captados, organizados e com exclusividade verificada.</p>
          </div>
          <div className="feature">
            <span className="fi ico-orange">🤝</span>
            <h3>Parceiros credenciados</h3>
            <p>Conecte-se apenas com corretores de CRECI verificado.</p>
          </div>
          <div className="feature">
            <span className="fi ico-blue">🔒</span>
            <h3>Negociação segura</h3>
            <p>Chat mediado, contrato digital e comissão protegida.</p>
          </div>
        </section>

        <p className="center" style={{ marginTop: '1.5rem' }}>
          <Link
            href="/como-funciona"
            className="link-quiet"
            style={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            Veja como funciona
          </Link>
        </p>
      </div>
    </div>
  );
}
