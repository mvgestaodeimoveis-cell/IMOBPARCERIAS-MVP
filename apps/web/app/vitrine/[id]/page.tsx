'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { formatBRL } from '@/lib/masks';
import { getAccessToken } from '@/lib/auth';
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
  const router = useRouter();
  const [imovel, setImovel] = useState<ImovelVitrine | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [clienteNome, setClienteNome] = useState('');
  const [perfilConfirmado, setPerfilConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [parceriaErro, setParceriaErro] = useState<string | null>(null);
  const [solicitada, setSolicitada] = useState(false);
  const [fotoAtiva, setFotoAtiva] = useState(0);

  useEffect(() => {
    apiFetch<ImovelVitrine>(`/vitrine/${params.id}`)
      .then(setImovel)
      .catch((err) => setErro(err instanceof ApiRequestError ? err.message : 'Imóvel indisponível.'));
  }, [params.id]);

  function iniciarSolicitacao() {
    if (!getAccessToken()) {
      router.push('/login');
      return;
    }
    setMostrarForm(true);
  }

  async function solicitarParceria(e: React.FormEvent) {
    e.preventDefault();
    setParceriaErro(null);
    const token = getAccessToken();
    if (!token) {
      router.push('/login');
      return;
    }
    setEnviando(true);
    try {
      await apiFetch('/parcerias', {
        method: 'POST',
        token,
        body: {
          imovel_id: params.id,
          cliente_nome: clienteNome.trim(),
          perfil_confirmado: true,
        },
      });
      setSolicitada(true);
      setMostrarForm(false);
    } catch (err) {
      setParceriaErro(
        err instanceof ApiRequestError ? err.message : 'Não foi possível solicitar a parceria.',
      );
    } finally {
      setEnviando(false);
    }
  }

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
                    <img
                      className="gallery-main"
                      src={imovel.fotos[fotoAtiva] ?? imovel.fotos[0]}
                      alt={`Foto ${fotoAtiva + 1} do imóvel`}
                    />
                    {imovel.fotos.length > 1 && (
                      <div className="gallery-thumbs">
                        {imovel.fotos.map((url, i) => (
                          <button
                            key={url}
                            type="button"
                            className={`gallery-thumb${i === fotoAtiva ? ' is-active' : ''}`}
                            onClick={() => setFotoAtiva(i)}
                            aria-label={`Ver foto ${i + 1}`}
                            aria-pressed={i === fotoAtiva}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Foto ${i + 1}`} />
                          </button>
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

                {solicitada ? (
                  <div className="banner banner-success" style={{ marginTop: '1.25rem' }}>
                    Solicitação enviada! Acompanhe em{' '}
                    <Link href="/parcerias">Minhas parcerias</Link>.
                  </div>
                ) : mostrarForm ? (
                  <form className="card" onSubmit={solicitarParceria} style={{ marginTop: '1.25rem' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Solicitar parceria</h3>
                    {parceriaErro && <div className="banner banner-error">{parceriaErro}</div>}
                    <div className="field">
                      <label htmlFor="cliente_nome">Nome do seu cliente</label>
                      <input
                        id="cliente_nome"
                        className="input"
                        placeholder="Nome do cliente comprador"
                        maxLength={120}
                        value={clienteNome}
                        onChange={(e) => setClienteNome(e.target.value)}
                      />
                    </div>
                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', margin: '0.5rem 0 1rem' }}>
                      <input
                        type="checkbox"
                        checked={perfilConfirmado}
                        onChange={(e) => setPerfilConfirmado(e.target.checked)}
                        style={{ width: 18, height: 18, marginTop: 2 }}
                      />
                      <span className="muted">
                        Confirmo que meu cliente tem interesse real em visitar este imóvel.
                      </span>
                    </label>
                    <button
                      type="submit"
                      className="btn btn-emerald"
                      disabled={enviando || clienteNome.trim().length < 3 || !perfilConfirmado}
                    >
                      {enviando ? 'Enviando…' : 'Enviar solicitação'}
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="btn btn-emerald"
                    style={{ marginTop: '1.25rem' }}
                    onClick={iniciarSolicitacao}
                  >
                    Solicitar parceria
                  </button>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
