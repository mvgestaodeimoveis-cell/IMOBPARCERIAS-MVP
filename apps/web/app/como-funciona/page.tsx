import Link from 'next/link';
import { Topbar } from '@/components/Topbar';
import { SiteFooter } from '@/components/SiteFooter';
import { LogoMark } from '@/components/LogoMark';

const PASSOS = [
  { n: '01', titulo: 'Cadastre seu imóvel', ico: '🏢', cls: 'ico-green' },
  { n: '02', titulo: 'Encontre o imóvel do seu cliente', ico: '🔍', cls: 'ico-orange' },
  { n: '03', titulo: 'Selecione os matches', ico: '✨', cls: 'ico-purple' },
  { n: '04', titulo: 'Encaminhe ao seu cliente', ico: '📨', cls: 'ico-blue' },
  { n: '05', titulo: 'Fale com o corretor parceiro', ico: '💬', cls: 'ico-indigo' },
  { n: '06', titulo: 'Agende sua visita', ico: '📅', cls: 'ico-yellow' },
  { n: '07', titulo: 'Feche negócios', ico: '🤝', cls: 'ico-pink' },
];

export default function ComoFuncionaPage() {
  return (
    <div className="site">
      <Topbar />

      <main>
        <section className="section">
          <div className="section-inner section-narrow">
            <Link href="/" className="auth-back" style={{ marginBottom: '1.5rem' }}>
              <span aria-hidden>←</span> Voltar para a home
            </Link>

            <span className="eyebrow">Como funciona</span>
            <h2 className="section-title">
              Do cadastro ao fechamento, em <span className="hl">uma rede só.</span>
            </h2>
            <p className="muted center" style={{ margin: '0.75rem auto 2rem', maxWidth: 640 }}>
              <strong style={{ color: 'var(--orange)' }}>ImobParcerias</strong> é uma rede para
              corretores credenciados. Nossa plataforma funciona com um banco de dados confiável e
              exclusivo de imóveis, para acelerar suas parcerias imobiliárias de forma segura.
            </p>

            <div className="steps-grid">
              {PASSOS.map((p) => (
                <div className="step" key={p.n}>
                  <span className={`step-ico ${p.cls}`}>{p.ico}</span>
                  <span>
                    <small>Passo {p.n}</small>
                    <strong>{p.titulo}</strong>
                  </span>
                </div>
              ))}
            </div>

            <div className="card-dark" style={{ marginTop: '2rem' }}>
              <LogoMark size={52} className="logo-hero" />
              <h3 style={{ textTransform: 'uppercase', fontWeight: 800 }}>
                Pronto para multiplicar suas vendas?
              </h3>
              <p style={{ color: '#cfd7df', fontSize: '0.9rem', margin: '0.5rem 0 1.25rem' }}>
                Cadastre-se hoje e tenha acesso a centenas de imóveis e demandas de parceiros
                credenciados.
              </p>
              <Link href="/cadastro" className="btn btn-emerald" style={{ marginBottom: '0.75rem' }}>
                Cadastre-se grátis
              </Link>
              <Link href="/login" className="btn btn-orange">
                Já tenho cadastro
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
