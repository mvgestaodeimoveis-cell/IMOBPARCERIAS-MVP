'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatBRL } from '@/lib/masks';
import { TIPO_LABEL } from '@/lib/labels';
import { isAuthenticated, getRole, getAccessToken } from '@/lib/auth';
import { encodeSelecao } from '@/lib/selecao';
import { Topbar } from '@/components/Topbar';
import { SiteFooter } from '@/components/SiteFooter';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';

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

const FILTROS_INICIAIS = {
  tipo: '',
  finalidade: '',
  cidade: '',
  bairro: '',
  preco_min: '',
  preco_max: '',
  area_min: '',
  quartos_min: '',
};

export default function VitrinePage() {
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [imoveis, setImoveis] = useState<ImovelVitrine[] | null>(null);
  const [total, setTotal] = useState(0);
  const [appNav, setAppNav] = useState(false);
  const [selMode, setSelMode] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [me, setMe] = useState<{ whatsapp?: string; nome?: string }>({});
  const [buscaTexto, setBuscaTexto] = useState('');
  const [interpretando, setInterpretando] = useState(false);
  const [buscaMsg, setBuscaMsg] = useState<string | null>(null);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  useEffect(() => {
    const logado = isAuthenticated() && getRole() !== 'equipe';
    setAppNav(logado);
    if (logado) {
      const token = getAccessToken();
      apiFetch<{ nome?: string; whatsapp?: string }>('/corretores/me', { token })
        .then((c) => setMe({ whatsapp: c.whatsapp, nome: c.nome }))
        .catch(() => setMe({}));
    }
  }, []);

  function toggleSel(id: string) {
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function compartilharSelecao() {
    if (sel.length === 0) return;
    const token = encodeSelecao(sel, { whatsapp: me.whatsapp, corretor: me.nome });
    const url = `${window.location.origin}/ver/${token}`;
    const texto = `Olá! Separei ${sel.length} imóvel(is) para você. Veja as opções e me diga qual mais gostou:`;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: 'Imóveis selecionados', text: texto, url });
        return;
      } catch {
        /* usuário cancelou o compartilhamento nativo */
        return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`, '_blank');
  }

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

  async function interpretarBusca() {
    if (buscaTexto.trim().length < 10) return;
    setBuscaMsg(null);
    setInterpretando(true);
    try {
      const res = await apiFetch<{ filtros: Record<string, string>; reconhecidos: string[] }>(
        '/vitrine/interpretar',
        { method: 'POST', body: { texto: buscaTexto.trim() } },
      );
      setFiltros((f) => {
        const next: Record<string, string> = { ...f };
        Object.entries(res.filtros).forEach(([k, v]) => {
          if (v && k in next) next[k] = v;
        });
        return next as typeof f;
      });
      setBuscaMsg(
        res.reconhecidos.length > 0
          ? `Filtros aplicados: ${res.reconhecidos.join(', ')}.`
          : 'Não reconhecemos filtros no texto — ajuste manualmente abaixo.',
      );
    } catch {
      setBuscaMsg('Não foi possível interpretar o texto.');
    } finally {
      setInterpretando(false);
    }
  }

  const filtrosAtivos = Object.values(filtros).filter((v) => v.trim() !== '').length;

  return (
    <div className="site">
      {appNav ? <AppHeader active="vitrine" /> : <Topbar />}

      <main className={appNav ? 'has-bottomnav' : undefined}>
        <section className="section">
          <div className="section-inner">
            <h1 className="section-title vitrine-titulo">
              Imóveis dos <span className="hl">parceiros</span>
            </h1>
            <p className="muted center vitrine-sub">
              O endereço completo é revelado apenas no chat, após o match.
            </p>

            {!buscaAberta ? (
              <button type="button" className="vitrine-colar" onClick={() => setBuscaAberta(true)}>
                <span aria-hidden>✨</span> Colar o pedido do cliente (WhatsApp)
              </button>
            ) : (
              <div className="card busca-ia">
                <div className="busca-ia-head">
                  <strong>Pedido do cliente</strong>
                  <button
                    type="button"
                    className="busca-ia-fechar"
                    aria-label="Fechar"
                    onClick={() => setBuscaAberta(false)}
                  >
                    ✕
                  </button>
                </div>
                <p className="muted" style={{ margin: '0 0 0.6rem', fontSize: '0.84rem' }}>
                  Cole o que o cliente mandou no WhatsApp e a gente aplica os filtros pra você.
                </p>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Ex.: procuro apartamento 3 quartos na Pituba até 500 mil, com vaga e vista mar"
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-navy btn-sm"
                  style={{ marginTop: '0.5rem' }}
                  disabled={interpretando || buscaTexto.trim().length < 10}
                  onClick={interpretarBusca}
                >
                  {interpretando ? 'Lendo…' : 'Aplicar filtros do texto'}
                </button>
                {buscaMsg && <div className="import-msg">{buscaMsg}</div>}
              </div>
            )}

            <div className="vitrine-toolbar">
              <button
                type="button"
                className="vitrine-filtros-btn"
                aria-expanded={filtrosAbertos}
                onClick={() => setFiltrosAbertos((v) => !v)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="7" y1="12" x2="17" y2="12" />
                  <line x1="10" y1="18" x2="14" y2="18" />
                </svg>
                Filtros
                {filtrosAtivos > 0 && <span className="vitrine-filtros-badge">{filtrosAtivos}</span>}
              </button>
              {imoveis !== null && <span className="muted vitrine-count">{total} imóvel(is)</span>}
              {filtrosAtivos > 0 && (
                <button type="button" className="vitrine-limpar" onClick={() => setFiltros(FILTROS_INICIAIS)}>
                  Limpar
                </button>
              )}
            </div>

            {filtrosAbertos && (
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
                <input className="input" inputMode="numeric" placeholder="Metragem mín. (m²)" value={filtros.area_min} onChange={(e) => set('area_min', e.target.value.replace(/\D/g, ''))} />
                <input className="input" inputMode="numeric" placeholder="Quartos mín." value={filtros.quartos_min} onChange={(e) => set('quartos_min', e.target.value.replace(/\D/g, ''))} />
              </div>
            )}

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
                <div className="vitrine-head vitrine-head-acoes">
                  {appNav &&
                    (selMode ? (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ width: 'auto', minHeight: 'auto', padding: '0.4rem 0.8rem' }}
                        onClick={() => {
                          setSelMode(false);
                          setSel([]);
                        }}
                      >
                        Cancelar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-emerald"
                        style={{ width: 'auto', minHeight: 'auto', padding: '0.4rem 0.8rem' }}
                        onClick={() => setSelMode(true)}
                      >
                        Selecionar p/ cliente
                      </button>
                    ))}
                </div>
                {selMode && (
                  <p className="muted" style={{ margin: '0.35rem 0 1rem', fontSize: '0.86rem' }}>
                    Toque nos imóveis que quer enviar ao cliente, depois em “Compartilhar”.
                  </p>
                )}
                {!selMode && <div style={{ height: '1rem' }} />}
                <div className={`vitrine-grid${selMode ? ' has-selbar' : ''}`}>
                  {imoveis.map((im) => {
                    const inner = (
                      <>
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
                      </>
                    );
                    if (selMode) {
                      const on = sel.includes(im.id);
                      return (
                        <button
                          key={im.id}
                          type="button"
                          className={`vitrine-card vitrine-selecionavel${on ? ' is-sel' : ''}`}
                          onClick={() => toggleSel(im.id)}
                          aria-pressed={on}
                        >
                          <span className="vitrine-check">{on ? '✓' : ''}</span>
                          {inner}
                        </button>
                      );
                    }
                    return (
                      <Link key={im.id} href={`/vitrine/${im.id}`} className="vitrine-card">
                        {inner}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      {selMode && (
        <div className="sel-bar">
          <span className="sel-bar-count">
            {sel.length} imóvel(is) selecionado(s)
          </span>
          <button
            type="button"
            className="btn btn-emerald"
            style={{ width: 'auto' }}
            disabled={sel.length === 0}
            onClick={compartilharSelecao}
          >
            Compartilhar
          </button>
        </div>
      )}

      {appNav ? <BottomNav active="vitrine" /> : <SiteFooter />}
    </div>
  );
}
