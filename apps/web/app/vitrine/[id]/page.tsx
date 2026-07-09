'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { formatBRL } from '@/lib/masks';
import { Topbar } from '@/components/Topbar';
import { SiteFooter } from '@/components/SiteFooter';

interface ImovelVitrine {
  id: string;
  finalidade: string;
  tipo: string;
  preco: number;
  cidade: string;
  bairro: string;
  area_m2: number | null;
  quartos: number | null;
  banheiros: number | null;
  vagas: number | null;
  fotos: string[];
  diferenciais: string[];
  exclusividade_verificada: boolean;
}

const TIPO_LABEL: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  terreno: 'Terreno',
  comercial: 'Comercial',
};

export default function VitrineDetalhePage() {
  const params = useParams<{ id: string }>();
  const [imovel, setImovel] = useState<ImovelVitrine | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ImovelVitrine>(`/vitrine/${params.id}`)
      .then(setImovel)
      .catch((err) => setErro(err instanceof ApiRequestError ? err.message : 'Imóvel indisponível.'));
  }, [params.id]);

  return (
    <div className="site">
      <Topbar />
      <main>
        <section className="section">
          <div className="section-inner section-narrow">
            <Link href="/vitrine" className="auth-back" style={{ marginBottom: '1rem' }}>
              <span aria-hidden>←</span> Voltar para a vitrine
            </Link>

            {erro && <div className="banner banner-error">{erro}</div>}

            {!imovel ? (
              !erro && <p className="muted">Carregando…</p>
            ) : (
              <>
                {imovel.fotos.length > 0 ? (
                  <div className="gallery">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="gallery-main" src={imovel.fotos[0]} alt="Foto do imóvel" />
                    {imovel.fotos.length > 1 && (
                      <div className="gallery-thumbs">
                        {imovel.fotos.slice(1).map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={url} src={url} alt={`Foto ${i + 2}`} />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="imovel-hero" aria-hidden>🏠</div>
                )}

                <div className="imovel-top" style={{ marginTop: '1rem' }}>
                  <h1 style={{ fontSize: '1.6rem' }}>{formatBRL(imovel.preco)}</h1>
                  <span className={`badge ${imovel.finalidade === 'venda' ? 'badge-emerald' : 'badge-orange'}`}>
                    {imovel.finalidade === 'venda' ? 'Venda' : 'Aluguel'}
                  </span>
                </div>
                <p className="muted" style={{ marginTop: '0.25rem' }}>
                  {TIPO_LABEL[imovel.tipo] ?? imovel.tipo} · {imovel.bairro}, {imovel.cidade}
                  {imovel.exclusividade_verificada && (
                    <span className="badge badge-emerald" style={{ marginLeft: '0.5rem' }}>✓ Exclusividade</span>
                  )}
                </p>

                <div className="card" style={{ marginTop: '1rem' }}>
                  <h3 className="detail-label">Características</h3>
                  <div className="detail-grid">
                    {imovel.area_m2 != null && <span><b>{imovel.area_m2}</b> m²</span>}
                    {imovel.quartos != null && <span><b>{imovel.quartos}</b> quarto(s)</span>}
                    {imovel.banheiros != null && <span><b>{imovel.banheiros}</b> banheiro(s)</span>}
                    {imovel.vagas != null && <span><b>{imovel.vagas}</b> vaga(s)</span>}
                  </div>
                </div>

                {imovel.diferenciais.length > 0 && (
                  <div className="card" style={{ marginTop: '0.85rem' }}>
                    <h3 className="detail-label">Diferenciais</h3>
                    <div className="chips">
                      {imovel.diferenciais.map((d) => (
                        <span key={d} className="chip chip-static">{d}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="card" style={{ marginTop: '0.85rem', background: 'var(--bg)' }}>
                  <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>
                    🔒 O endereço completo e o contato do corretor são revelados apenas após o match e
                    a confirmação bilateral, conforme as regras da plataforma.
                  </p>
                </div>

                <Link href="/cadastro" className="btn btn-emerald" style={{ marginTop: '1.25rem' }}>
                  Solicitar parceria
                </Link>
              </>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
