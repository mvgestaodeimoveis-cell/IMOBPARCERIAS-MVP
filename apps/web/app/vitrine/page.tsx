'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatBRL, formatMilhar } from '@/lib/masks';
import { dataPublicacao } from '@/lib/format';
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
  condominio: number | null;
  iptu: number | null;
  taxas_inclusas: boolean;
  area_m2: number | null;
  quartos: number | null;
  banheiros: number | null;
  vagas: number | null;
  fotos: string[];
  diferenciais: string[];
  exclusividade_verificada: boolean;
  criado_em: string;
  atualizado_em: string;
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

const CIDADES = [
  'Salvador',
  'Lauro de Freitas',
  'Camaçari',
  'Mata de São João',
  "Dias d'Ávila",
  'Simões Filho',
];

const TIPOS_FILTRO: { v: string; l: string }[] = [
  { v: '', l: 'Todos' },
  { v: 'apartamento', l: 'Apartamento' },
  { v: 'casa', l: 'Casa' },
  { v: 'terreno', l: 'Terreno' },
  { v: 'comercial', l: 'Comercial' },
];

// Faixas de valor prontas para a busca rápida (mapeiam para preco_min/preco_max).
const FAIXAS: { v: string; l: string; min: string; max: string }[] = [
  { v: '', l: 'Qualquer valor', min: '', max: '' },
  { v: 'a', l: 'Até R$ 300 mil', min: '', max: '300000' },
  { v: 'b', l: 'R$ 300 mil a 500 mil', min: '300000', max: '500000' },
  { v: 'c', l: 'R$ 500 mil a 800 mil', min: '500000', max: '800000' },
  { v: 'd', l: 'R$ 800 mil a 1 milhão', min: '800000', max: '1000000' },
  { v: 'e', l: 'Acima de R$ 1 milhão', min: '1000000', max: '' },
];

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
    let url: string;
    try {
      const token = getAccessToken();
      const res = await apiFetch<{ codigo: string }>('/selecoes', {
        method: 'POST',
        body: { ids: sel },
        token,
      });
      url = `${window.location.origin}/ver/${res.codigo}`;
    } catch {
      // Fallback: link autocontido (caso o endpoint de link curto não esteja disponível).
      const legacy = encodeSelecao(sel, { whatsapp: me.whatsapp, corretor: me.nome });
      url = `${window.location.origin}/ver/${legacy}`;
    }
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

  const faixaAtual =
    FAIXAS.find((f) => f.min === filtros.preco_min && f.max === filtros.preco_max)?.v ?? '';

  function setFaixa(v: string) {
    const f = FAIXAS.find((x) => x.v === v) ?? FAIXAS[0];
    setFiltros((prev) => ({ ...prev, preco_min: f.min, preco_max: f.max }));
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
      {appNav ? <AppHeader active="inicio" /> : <Topbar />}

      <main className={appNav ? 'has-bottomnav' : undefined}>
        <section className="section">
          <div className="section-inner">
            <h1 className="section-title vitrine-titulo">
              Imóveis dos <span className="hl">parceiros</span>
            </h1>
            <p className="muted center vitrine-sub">
              O endereço completo é revelado apenas no chat, após o match.
            </p>

            <div className="card busca-rapida">
              <div className="busca-rapida-grid">
                <label className="filtro-campo">
                  <span className="filtro-campo-label">Finalidade</span>
                  <select className="input" value={filtros.finalidade} onChange={(e) => set('finalidade', e.target.value)}>
                    <option value="">Todas</option>
                    <option value="venda">Venda</option>
                    <option value="aluguel">Aluguel</option>
                  </select>
                </label>
                <label className="filtro-campo">
                  <span className="filtro-campo-label">Tipo</span>
                  <select className="input" value={filtros.tipo} onChange={(e) => set('tipo', e.target.value)}>
                    {TIPOS_FILTRO.map((t) => (
                      <option key={t.v} value={t.v}>{t.l}</option>
                    ))}
                  </select>
                </label>
                <label className="filtro-campo">
                  <span className="filtro-campo-label">Cidade</span>
                  <select className="input" value={filtros.cidade} onChange={(e) => set('cidade', e.target.value)}>
                    <option value="">Todas</option>
                    {CIDADES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="filtro-campo">
                  <span className="filtro-campo-label">Faixa de valor</span>
                  <select className="input" value={faixaAtual} onChange={(e) => setFaixa(e.target.value)}>
                    {FAIXAS.map((f) => (
                      <option key={f.v} value={f.v}>{f.l}</option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="muted busca-rapida-dica">
                Busque pelos botões acima <strong>ou</strong> cole o pedido do cliente abaixo.
              </p>
            </div>

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
              <div className="filtros-panel">
                <div className="filtro-grupo">
                  <span className="filtro-label" id="lbl-finalidade">Finalidade</span>
                  <div className="filtro-chips" role="group" aria-labelledby="lbl-finalidade">
                    {[['', 'Todas'], ['venda', 'Venda'], ['aluguel', 'Aluguel']].map(([v, l]) => (
                      <button
                        key={v}
                        type="button"
                        className={`filtro-chip${filtros.finalidade === v ? ' on' : ''}`}
                        aria-pressed={filtros.finalidade === v}
                        onClick={() => set('finalidade', v)}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="filtro-grupo">
                  <span className="filtro-label" id="lbl-tipo">Tipo de imóvel</span>
                  <div className="filtro-chips" role="group" aria-labelledby="lbl-tipo">
                    {TIPOS_FILTRO.map((t) => (
                      <button
                        key={t.v}
                        type="button"
                        className={`filtro-chip${filtros.tipo === t.v ? ' on' : ''}`}
                        aria-pressed={filtros.tipo === t.v}
                        onClick={() => set('tipo', t.v)}
                      >
                        {t.l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="filtro-grupo">
                  <span className="filtro-label" id="lbl-quartos">Quartos (mínimo)</span>
                  <div className="filtro-chips" role="group" aria-labelledby="lbl-quartos">
                    <button
                      type="button"
                      className={`filtro-chip${!filtros.quartos_min ? ' on' : ''}`}
                      aria-pressed={!filtros.quartos_min}
                      onClick={() => set('quartos_min', '')}
                    >
                      Qualquer
                    </button>
                    {['1', '2', '3', '4'].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`filtro-chip${filtros.quartos_min === n ? ' on' : ''}`}
                        aria-pressed={filtros.quartos_min === n}
                        onClick={() => set('quartos_min', n)}
                      >
                        {n}+
                      </button>
                    ))}
                  </div>
                </div>

                <div className="filtro-grupo">
                  <span className="filtro-label">Localização</span>
                  <div className="filtro-row2">
                    <label className="filtro-campo">
                      <span className="filtro-campo-label">Cidade</span>
                      <select className="input" value={filtros.cidade} onChange={(e) => set('cidade', e.target.value)}>
                        <option value="">Todas</option>
                        {CIDADES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label className="filtro-campo">
                      <span className="filtro-campo-label">Bairro</span>
                      <input className="input" placeholder="Ex.: Pituba" value={filtros.bairro} onChange={(e) => set('bairro', e.target.value)} />
                    </label>
                  </div>
                </div>

                <div className="filtro-grupo">
                  <span className="filtro-label">Faixa de preço</span>
                  <div className="filtro-row2">
                    <label className="filtro-campo">
                      <span className="filtro-campo-label">De</span>
                      <div className="input-prefix">
                        <span>R$</span>
                        <input inputMode="numeric" placeholder="0" value={formatMilhar(filtros.preco_min)} onChange={(e) => set('preco_min', e.target.value.replace(/\D/g, ''))} />
                      </div>
                    </label>
                    <label className="filtro-campo">
                      <span className="filtro-campo-label">Até</span>
                      <div className="input-prefix">
                        <span>R$</span>
                        <input inputMode="numeric" placeholder="Sem limite" value={formatMilhar(filtros.preco_max)} onChange={(e) => set('preco_max', e.target.value.replace(/\D/g, ''))} />
                      </div>
                    </label>
                  </div>
                </div>

                <div className="filtro-grupo">
                  <label className="filtro-campo">
                    <span className="filtro-label">Metragem mínima</span>
                    <div className="input-prefix input-suffix">
                      <input inputMode="numeric" placeholder="0" value={filtros.area_min} onChange={(e) => set('area_min', e.target.value.replace(/\D/g, ''))} />
                      <span>m²</span>
                    </div>
                  </label>
                </div>

                <div className="filtro-acoes">
                  {filtrosAtivos > 0 && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFiltros(FILTROS_INICIAIS)}>
                      Limpar filtros
                    </button>
                  )}
                  <button type="button" className="btn btn-emerald filtro-ver" onClick={() => setFiltrosAbertos(false)}>
                    Ver {total} imóvel(is)
                  </button>
                </div>
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
                          {im.finalidade === 'aluguel' && (
                            <p className="imovel-meta">
                              {im.taxas_inclusas
                                ? 'Condomínio + IPTU inclusos'
                                : [
                                    im.condominio != null ? `Cond. ${formatBRL(im.condominio)}` : null,
                                    im.iptu != null ? `IPTU ${formatBRL(im.iptu)}` : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ') || null}
                            </p>
                          )}
                          <p className="vitrine-data">Atualizado em {dataPublicacao(im.atualizado_em)}</p>
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

      {appNav ? <BottomNav active="inicio" /> : <SiteFooter />}
    </div>
  );
}
