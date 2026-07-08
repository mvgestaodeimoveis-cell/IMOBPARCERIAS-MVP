import Link from 'next/link';
import { Topbar } from '@/components/Topbar';
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
    <div className="frame frame-marketing">
      <Topbar />
      <div className="screen">
        <Link
          href="/"
          className="link-quiet"
          style={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          ← Voltar
        </Link>

        <span className="eyebrow" style={{ marginTop: '1.25rem' }}>
          Como funciona
        </span>
        <h2 className="section-title">
          Do cadastro ao fechamento, em <span className="hl">uma rede só.</span>
        </h2>
        <p className="muted center" style={{ margin: '0.75rem 0 1.75rem' }}>
          <strong style={{ color: 'var(--orange)' }}>ImobParcerias</strong> é uma rede para
          corretores credenciados. Nossa plataforma funciona com um banco de dados confiável e
          exclusivo de imóveis, para acelerar suas parcerias imobiliárias de forma segura.
        </p>

        {/* passos */}
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
        <div className="card-dark" style={{ marginTop: '1.5rem' }}>
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
    </div>
  );
}
