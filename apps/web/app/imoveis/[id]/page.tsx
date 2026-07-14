'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { formatBRL } from '@/lib/masks';
import { getAccessToken } from '@/lib/auth';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { TIPO_LABEL, IMOVEL_STATUS_LABEL as STATUS_LABEL } from '@/lib/labels';
import { AppHeader } from '@/components/AppHeader';
import { Lightbox } from '@/components/Lightbox';

interface Imovel {
  id: string;
  finalidade: string;
  tipo: string;
  preco: number;
  cidade: string;
  bairro: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  area_m2: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  descricao: string | null;
  status: string;
  fotos: string[];
}

export default function ImovelDetalhePage() {
  const router = useRouter();
  const token = useAuthGuard();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [imovel, setImovel] = useState<Imovel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [acao, setAcao] = useState(false);
  const [fotoAtiva, setFotoAtiva] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<Imovel>(`/imoveis/${id}`, { token })
      .then(setImovel)
      .catch((err) => {
        setErro(err instanceof ApiRequestError ? err.message : 'Imóvel não encontrado.');
      });
  }, [id, token]);

  async function mudarStatus(status: 'ativo' | 'vendido' | 'em_negociacao') {
    const token = getAccessToken();
    if (!token) return;
    setAcao(true);
    try {
      const atualizado = await apiFetch<Imovel>(`/imoveis/${id}`, {
        method: 'PATCH',
        token,
        body: { status },
      });
      setImovel(atualizado);
    } catch (err) {
      setErro(err instanceof ApiRequestError ? err.message : 'Não foi possível atualizar.');
    } finally {
      setAcao(false);
    }
  }

  async function excluir() {
    if (!confirm('Remover este imóvel da sua carteira?')) return;
    const token = getAccessToken();
    if (!token) return;
    setAcao(true);
    try {
      await apiFetch(`/imoveis/${id}`, { method: 'DELETE', token });
      router.push('/painel');
    } catch (err) {
      setErro(err instanceof ApiRequestError ? err.message : 'Não foi possível remover.');
      setAcao(false);
    }
  }

  return (
    <div className="frame frame-app">
      <AppHeader back={{ href: '/painel', label: 'Carteira' }} />

      <div className="screen">
        {erro && <div className="banner banner-error">{erro}</div>}

        {!imovel ? (
          <p className="muted">Carregando…</p>
        ) : (
          <>
            {imovel.fotos && imovel.fotos.length > 0 ? (
              <div className="gallery">
                <button
                  type="button"
                  className="gallery-main-btn"
                  onClick={() => setLightbox(fotoAtiva)}
                  aria-label="Ampliar foto"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="gallery-main"
                    src={imovel.fotos[fotoAtiva] ?? imovel.fotos[0]}
                    alt={`Foto ${fotoAtiva + 1} do imóvel`}
                  />
                </button>
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
              <h1 style={{ fontSize: '1.5rem' }}>{formatBRL(imovel.preco)}</h1>
              <span className={`badge ${imovel.finalidade === 'venda' ? 'badge-emerald' : 'badge-orange'}`}>
                {imovel.finalidade === 'venda' ? 'Venda' : 'Aluguel'}
              </span>
            </div>
            <p className="muted" style={{ marginTop: '0.25rem' }}>
              {TIPO_LABEL[imovel.tipo] ?? imovel.tipo}
              {imovel.status !== 'ativo' && (
                <span
                  className={`badge ${imovel.status === 'em_negociacao' ? 'badge-orange' : 'badge-gray'}`}
                  style={{ marginLeft: '0.5rem' }}
                >
                  {STATUS_LABEL[imovel.status] ?? imovel.status}
                </span>
              )}
            </p>

            <div className="card" style={{ marginTop: '1rem' }}>
              <h3 className="detail-label">Endereço</h3>
              <p style={{ margin: 0 }}>
                {imovel.logradouro}, {imovel.numero}
                {imovel.complemento ? ` — ${imovel.complemento}` : ''}
                <br />
                {imovel.bairro}, {imovel.cidade} · CEP {imovel.cep}
              </p>
            </div>

            <div className="card" style={{ marginTop: '0.85rem' }}>
              <h3 className="detail-label">Características</h3>
              <div className="detail-grid">
                {imovel.area_m2 != null && <span><b>{imovel.area_m2}</b> m²</span>}
                {imovel.quartos != null && <span><b>{imovel.quartos}</b> quarto(s)</span>}
                {imovel.suites != null && <span><b>{imovel.suites}</b> suíte(s)</span>}
                {imovel.banheiros != null && <span><b>{imovel.banheiros}</b> banheiro(s)</span>}
                {imovel.vagas != null && <span><b>{imovel.vagas}</b> vaga(s)</span>}
              </div>
              {imovel.descricao && (
                <p className="muted" style={{ marginTop: '0.85rem' }}>{imovel.descricao}</p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.25rem' }}>
              {imovel.status === 'ativo' && (
                <>
                  <button className="btn btn-orange" disabled={acao} onClick={() => mudarStatus('em_negociacao')}>
                    Marcar em negociação
                  </button>
                  <button className="btn btn-emerald" disabled={acao} onClick={() => mudarStatus('vendido')}>
                    Marcar como vendido
                  </button>
                </>
              )}
              {imovel.status === 'em_negociacao' && (
                <>
                  <button className="btn btn-emerald" disabled={acao} onClick={() => mudarStatus('ativo')}>
                    Voltar para disponível
                  </button>
                  <button className="btn btn-orange" disabled={acao} onClick={() => mudarStatus('vendido')}>
                    Marcar como vendido
                  </button>
                </>
              )}
              {(imovel.status === 'vendido' || imovel.status === 'inativo') && (
                <button className="btn btn-emerald" disabled={acao} onClick={() => mudarStatus('ativo')}>
                  Reativar imóvel
                </button>
              )}
              {imovel.status !== 'inativo' && (
                <button className="btn btn-ghost" disabled={acao} onClick={excluir}>
                  Remover da carteira
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {lightbox !== null && imovel && (
        <Lightbox fotos={imovel.fotos} index={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
