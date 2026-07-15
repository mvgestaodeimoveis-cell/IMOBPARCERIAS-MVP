import Link from 'next/link';
import { Topbar } from '@/components/Topbar';
import { SiteFooter } from '@/components/SiteFooter';
import { LogoMark } from '@/components/LogoMark';
import { InstallPrompt } from '@/components/InstallPrompt';

export default function LandingPage() {
  return (
    <div className="site">
      <Topbar />

      <main>
        <section className="hero-band">
          <div className="hero-content">
            <LogoMark size={76} className="logo-hero" />
            <h1>
              Publique seus imóveis e aumente suas <span className="hl">vendas em parcerias.</span>
            </h1>
            <p className="hero-sub">Salvador, Região Metropolitana e Linha Verde</p>
            <p className="hero-tag">Focamos nas conexões, não em anúncios</p>
            <div className="hero-actions">
              <Link href="/cadastro" className="btn btn-emerald btn-inline">
                <span>
                  Entrar ou cadastrar-se
                  <span className="btn-sub">Exclusivo para corretores</span>
                </span>
              </Link>
            </div>
            <p className="hero-nomensalidade">
              <span aria-hidden>✓</span> Sem mensalidade
            </p>
            <InstallPrompt />
          </div>
        </section>

        <section className="section">
          <div className="section-inner">
            <span className="eyebrow">Por que a ImobParcerias</span>
            <h2 className="section-title">
              Tudo para fechar <span className="hl">mais parcerias.</span>
            </h2>

            <div className="features">
              <div className="feature">
                <span className="fi ico-green">🏠</span>
                <h3>Vitrine sem duplicatas</h3>
                <p>
                  Cada imóvel aparece <strong>uma única vez</strong>, com exclusividade verificada.
                  Chega de brigar por captação repetida.
                </p>
              </div>
              <div className="feature">
                <span className="fi ico-orange">🤝</span>
                <h3>Parceiros credenciados</h3>
                <p>
                  Você só se conecta com corretores de <strong>CRECI verificado</strong> pela nossa
                  equipe — nada de perfil anônimo de grupo de WhatsApp.
                </p>
              </div>
              <div className="feature">
                <span className="fi ico-blue">🔒</span>
                <h3>Negociação segura</h3>
                <p>Chat mediado, contrato digital e comissão protegida.</p>
              </div>
            </div>

            <div className="veja-wrap">
              <Link href="/como-funciona" className="btn btn-orange btn-inline">
                Veja como funciona
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
