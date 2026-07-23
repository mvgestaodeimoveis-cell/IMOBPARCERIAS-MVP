import Link from 'next/link';
import { Topbar } from '@/components/Topbar';
import { SiteFooter } from '@/components/SiteFooter';
import { LogoMark } from '@/components/LogoMark';

export const metadata = {
  title: 'Como instalar o app na tela — Imob Parcerias',
  description:
    'Passo a passo para adicionar o Imob Parcerias à tela inicial do celular (Android e iPhone).',
};

const ANDROID = [
  'Abra o site imobparcerias.com.br no navegador Chrome.',
  'Toque no menu ⋮ (três pontinhos) no canto superior direito.',
  'Escolha “Instalar aplicativo” (ou “Adicionar à tela inicial”).',
  'Confirme em “Instalar”. Pronto: o ícone aparece na tela do celular.',
];

const IOS = [
  'Abra o site imobparcerias.com.br no navegador Safari (precisa ser o Safari).',
  'Toque no botão Compartilhar (o quadrado com a seta ⬆️, na barra de baixo).',
  'Role e toque em “Adicionar à Tela de Início”.',
  'Toque em “Adicionar” no canto superior direito. O ícone aparece na tela.',
];

export default function ComoInstalarPage() {
  return (
    <div className="site">
      <Topbar />

      <main>
        <section className="hero-band hero-compact">
          <div className="hero-content">
            <span className="eyebrow">Instale o app</span>
            <h1>
              Tenha o Imob Parcerias <span className="hl">na tela do celular.</span>
            </h1>
            <p className="hero-sub" style={{ maxWidth: 560, margin: '1rem auto 0' }}>
              É rápido e não ocupa espaço — funciona como um aplicativo, sem precisar baixar da
              loja. Siga o passo a passo do seu celular.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-inner section-narrow">
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                <span aria-hidden>🤖</span> Android (Chrome)
              </h2>
              <ol style={{ margin: '0.75rem 0 0', paddingLeft: '1.2rem', lineHeight: 1.7 }}>
                {ANDROID.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
            </div>

            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                <span aria-hidden>🍎</span> iPhone (Safari)
              </h2>
              <ol style={{ margin: '0.75rem 0 0', paddingLeft: '1.2rem', lineHeight: 1.7 }}>
                {IOS.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
              <p className="muted" style={{ margin: '0.85rem 0 0', fontSize: '0.85rem' }}>
                No iPhone só funciona pelo <strong>Safari</strong> — se abriu por outro navegador ou
                pelo WhatsApp, toque em “abrir no Safari” primeiro.
              </p>
            </div>

            <div className="card-dark cta-final">
              <LogoMark size={52} className="logo-hero" />
              <h3 style={{ textTransform: 'uppercase', fontWeight: 800 }}>Pronto para começar?</h3>
              <p style={{ color: '#cfd7df', fontSize: '0.92rem', margin: '0.5rem 0 1.5rem' }}>
                Depois de instalar, é só abrir pelo ícone e entrar com o seu login.
              </p>
              <div className="cta-final-actions">
                <Link href="/login" className="btn btn-emerald btn-inline">
                  Entrar
                </Link>
                <Link href="/como-funciona" className="btn btn-orange btn-inline">
                  Como funciona
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
