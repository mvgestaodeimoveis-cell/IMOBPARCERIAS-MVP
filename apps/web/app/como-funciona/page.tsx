import Link from 'next/link';
import { Topbar } from '@/components/Topbar';
import { SiteFooter } from '@/components/SiteFooter';
import { LogoMark } from '@/components/LogoMark';

const PASSOS = [
  {
    n: '01',
    titulo: 'Cadastre seu imóvel',
    desc: 'Adicione seus imóveis captados ao banco exclusivo, com exclusividade verificada.',
    ico: '🏢',
    cls: 'ico-green',
  },
  {
    n: '02',
    titulo: 'Encontre o imóvel do seu cliente',
    desc: 'Busque no banco de parceiros a opção ideal para a demanda do seu comprador.',
    ico: '🔍',
    cls: 'ico-orange',
  },
  {
    n: '03',
    titulo: 'Selecione os matches',
    desc: 'A plataforma cruza ofertas e demandas e destaca as melhores combinações.',
    ico: '✨',
    cls: 'ico-purple',
  },
  {
    n: '04',
    titulo: 'Encaminhe ao seu cliente',
    desc: 'Compartilhe as opções selecionadas com o seu cliente em poucos toques.',
    ico: '📨',
    cls: 'ico-blue',
  },
  {
    n: '05',
    titulo: 'Fale com o corretor parceiro',
    desc: 'Converse com o captador pelo chat mediado, sem expor seus contatos.',
    ico: '💬',
    cls: 'ico-indigo',
  },
  {
    n: '06',
    titulo: 'Agende sua visita',
    desc: 'Marque a visita pela agenda integrada, com tudo registrado.',
    ico: '📅',
    cls: 'ico-yellow',
  },
  {
    n: '07',
    titulo: 'Feche negócios',
    desc: 'Formalize a parceria com contrato digital e comissão protegida.',
    ico: '🤝',
    cls: 'ico-pink',
  },
];

export default function ComoFuncionaPage() {
  return (
    <div className="site">
      <Topbar />

      <main>
        <section className="hero-band hero-compact">
          <div className="hero-content">
            <span className="eyebrow">Como funciona</span>
            <h1>
              Do cadastro ao fechamento, em <span className="hl">uma rede só.</span>
            </h1>
            <p className="hero-sub" style={{ maxWidth: 560, margin: '1rem auto 0' }}>
              Uma rede para corretores credenciados, com um banco de imóveis confiável e exclusivo
              para acelerar suas parcerias com segurança.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-inner section-narrow">
            <ol className="timeline">
              {PASSOS.map((p) => (
                <li className="tl-item" key={p.n}>
                  <span className={`tl-node ${p.cls}`}>{p.ico}</span>
                  <div className="tl-card">
                    <small>Passo {p.n}</small>
                    <h3>{p.titulo}</h3>
                    <p>{p.desc}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="card-dark cta-final">
              <LogoMark size={52} className="logo-hero" />
              <h3 style={{ textTransform: 'uppercase', fontWeight: 800 }}>
                Pronto para multiplicar suas vendas?
              </h3>
              <p style={{ color: '#cfd7df', fontSize: '0.92rem', margin: '0.5rem 0 1.5rem' }}>
                Cadastre-se hoje e tenha acesso a centenas de imóveis e demandas de parceiros
                credenciados.
              </p>
              <div className="cta-final-actions">
                <Link href="/cadastro" className="btn btn-emerald btn-inline">
                  Cadastre-se grátis
                </Link>
                <Link href="/login" className="btn btn-orange btn-inline">
                  Já tenho cadastro
                </Link>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Link href="/" className="btn btn-ghost btn-inline">
                <span aria-hidden>🏠</span> Voltar para a página inicial
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
