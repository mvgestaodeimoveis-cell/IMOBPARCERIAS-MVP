'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { formatBRL } from '@/lib/masks';
import { decodeSelecao } from '@/lib/selecao';
import { Lightbox } from '@/components/Lightbox';

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
}

const TIPO_LABEL: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  terreno: 'Terreno',
  comercial: 'Comercial',
};

export default function SelecaoClientePage() {
  const params = useParams<{ token: string }>();
  const [imoveis, setImoveis] = useState<ImovelVitrine[] | null>(null);
  const [lightbox, setLightbox] = useState<{ fotos: string[]; index: number } | null>(null);
  const [corretorWa, setCorretorWa] = useState<string | undefined>();
  const [corretorNome, setCorretorNome] = useState<string | undefined>();

  useEffect(() => {
    const data = decodeSelecao(params.token);
    setCorretorWa(data.whatsapp);
    setCorretorNome(data.corretor);
    if (data.ids.length === 0) {
      setImoveis([]);
      return;
    }
    Promise.all(
      data.ids.map((id) => apiFetch<ImovelVitrine>(`/vitrine/${id}`).catch(() => null)),
    ).then((res) => setImoveis(res.filter((x): x is ImovelVitrine => x !== null)));
  }, [params.token]);

  function gostei(im: ImovelVitrine) {
    if (!corretorWa) return;
    const digitos = corretorWa.replace(/\D/g, '');
    const numero = digitos.length <= 11 ? `55${digitos}` : digitos;
    const local = `${TIPO_LABEL[im.tipo] ?? im.tipo} em ${im.bairro}, ${im.cidade}`;
    const msg = `Olá${corretorNome ? ` ${corretorNome.split(' ')[0]}` : ''}! Vi a seleção que você me enviou e gostei deste: ${formatBRL(im.preco)} — ${local}.`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  return (
    <div className="site cliente-view">
      <header className="cliente-topo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="" className="cliente-logo" />
        <span>Imob Parcerias</span>
      </header>

      <main>
        <section className="section">
          <div className="section-inner section-narrow">
            <h1 className="section-title" style={{ marginBottom: '0.35rem' }}>
              Seleção de imóveis <span className="hl">para você</span>
            </h1>
            <p className="muted" style={{ margin: '0 0 1.5rem' }}>
              Seu corretor separou estas opções. Veja as fotos e os detalhes e diga a ele qual você
              mais gostou.
            </p>

            {imoveis === null ? (
              <p className="muted">Carregando…</p>
            ) : imoveis.length === 0 ? (
              <div className="card empty-state">
                <span className="empty-ico">🔗</span>
                <h3 style={{ textTransform: 'uppercase', fontWeight: 800 }}>Link indisponível</h3>
                <p className="muted" style={{ margin: 0 }}>
                  Peça ao seu corretor para enviar o link novamente.
                </p>
              </div>
            ) : (
              <div className="cliente-lista">
                {imoveis.map((im) => (
                  <article key={im.id} className="cliente-card">
                    <button
                      type="button"
                      className="cliente-foto"
                      onClick={() => im.fotos.length && setLightbox({ fotos: im.fotos, index: 0 })}
                      aria-label="Ampliar fotos"
                    >
                      {im.fotos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={im.fotos[0]} alt="Foto do imóvel" />
                      ) : (
                        <span aria-hidden>🏠</span>
                      )}
                      {im.fotos.length > 1 && (
                        <span className="cliente-fotos-badge">{im.fotos.length} fotos</span>
                      )}
                    </button>
                    <div className="cliente-corpo">
                      <div className="imovel-top">
                        <strong>{formatBRL(im.preco)}</strong>
                        <span className={`badge ${im.finalidade === 'venda' ? 'badge-emerald' : 'badge-orange'}`}>
                          {im.finalidade === 'venda' ? 'Venda' : 'Aluguel'}
                        </span>
                      </div>
                      <p className="imovel-sub">
                        {TIPO_LABEL[im.tipo] ?? im.tipo} · {im.bairro}, {im.cidade}
                      </p>
                      <p className="imovel-meta">
                        {[
                          im.area_m2 ? `${im.area_m2} m²` : null,
                          im.quartos != null ? `${im.quartos} quarto(s)` : null,
                          im.banheiros != null ? `${im.banheiros} banheiro(s)` : null,
                          im.vagas != null ? `${im.vagas} vaga(s)` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {im.diferenciais.length > 0 && (
                        <div className="chips" style={{ marginTop: '0.5rem' }}>
                          {im.diferenciais.map((d) => (
                            <span key={d} className="chip chip-static">
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
                      {corretorWa && (
                        <button
                          type="button"
                          className="btn btn-emerald cliente-gostei"
                          onClick={() => gostei(im)}
                        >
                          💚 Gostei deste — avisar corretor
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            <p className="muted center" style={{ marginTop: '1.5rem', fontSize: '0.82rem' }}>
              Imóveis apresentados pelo seu corretor. As tratativas são feitas diretamente com ele.
            </p>
          </div>
        </section>
      </main>

      {lightbox && (
        <Lightbox
          fotos={lightbox.fotos}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
