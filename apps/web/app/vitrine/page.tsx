'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
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

const FILTROS_INICIAIS = {
  tipo: '',
  finalidade: '',
  cidade: '',
  bairro: '',
  preco_min: '',
  preco_max: '',
  quartos_min: '',
};

export default function VitrinePage() {
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [imoveis, setImoveis] = useState<ImovelVitrine[] | null>(null);
  const [total, setTotal] = useState(0);

  const buscar = useCallback(async () => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v.trim()) params.set(k, v.trim());
    });
    const qs = params.toString();
    try {
      const res = await apiFetch<{ data: ImovelVitrine[]; total: number }>(
        `/vitrine${qs ? `?${qs}` : ''}`,
      );
      setImoveis(res.data);
      setTotal(res.total);
    } catch {
      setImoveis([]);
      setTotal(0);
    }
  }, [filtros]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  function set<K extends keyof typeof filtros>(k: K, v: string) {
    setFiltros((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="site">
      <Topbar />

      <main>
        <section className="section">
          <div className="section-inner">
            <span className="eyebrow">Vitrine de parceria</span>
            <h1 className="section-title" style={{ marginBottom: '0.5rem' }}>
              Imóveis dos <span className="hl">parceiros</span>
            </h1>
            <p className="muted center" style={{ margin: '0 auto 1.5rem', maxWidth: 560 }}>
              Encontre o imóvel ideal para o seu cliente. O endereço completo é revelado apenas no
              chat, após o match.
            </p>

            <div className="filtros">
              <select className="input" value={filtros.finalidade} onChange={(e) => set('finalidade', e.target.value)}>
                <option value="">Finalidade</option>
                <option value="venda">Venda</option>
                <option value="aluguel">Aluguel</option>
              </select>
              <select className="input" value={filtros.tipo} onChange={(e) => set('tipo', e.target.value)}>
                <option value="">Tipo</option>
                <option value="apartamento">Apartamento</option>
                <option value="casa">Casa</option>
                <option value="terreno">Terreno</option>
                <option value="comercial">Comercial</option>
              </select>
              <input className="input" placeholder="Cidade" value={filtros.cidade} onChange={(e) => set('cidade', e.target.value)} />
              <input className="input" placeholder="Bairro" value={filtros.bairro} onChange={(e) => set('bairro', e.target.value)} />
              <input className="input" inputMode="numeric" placeholder="Preço mín." value={filtros.preco_min} onChange={(e) => set('preco_min', e.target.value.replace(/\D/g, ''))} />
              <input className="input" inputMode="numeric" placeholder="Preço máx." value={filtros.preco_max} onChange={(e) => set('preco_max', e.target.value.replace(/\D/g, ''))} />
              <input className="input" inputMode="numeric" placeholder="Quartos mín." value={filtros.quartos_min} onChange={(e) => set('quartos_min', e.target.value.replace(/\D/g, ''))} />
              <button className="btn btn-ghost" type="button" onClick={() => setFiltros(FILTROS_INICIAIS)}>
                Limpar
              </button>
            </div>

            {imoveis === null ? (
              <p className="muted center">Carregando vitrine…</p>
            ) : imoveis.length === 0 ? (
              <div className="card empty-state">
                <span className="empty-ico">🔍</span>
                <h3 style={{ textTransform: 'uppercase', fontWeight: 800 }}>Nenhum imóvel encontrado</h3>
                <p className="muted" style={{ margin: 0 }}>Ajuste os filtros e tente novamente.</p>
              </div>
            ) : (
              <>
                <p className="muted" style={{ marginBottom: '1rem' }}>{total} imóvel(is) na vitrine</p>
                <div className="vitrine-grid">
                  {imoveis.map((im) => (
                    <Link key={im.id} href={`/vitrine/${im.id}`} className="vitrine-card">
                      <div className="vitrine-foto">
                        {im.fotos[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={im.fotos[0]} alt="" />
                        ) : (
                          <span aria-hidden>🏠</span>
                        )}
                        {im.exclusividade_verificada && (
                          <span className="vitrine-excl">✓ Exclusividade</span>
                        )}
                      </div>
                      <div className="vitrine-body">
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
                            im.quartos != null ? `${im.quartos} qto` : null,
                            im.banheiros != null ? `${im.banheiros} banh.` : null,
                            im.vagas != null ? `${im.vagas} vaga` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
