'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { formatBRL } from '@/lib/masks';
import { getAccessToken } from '@/lib/auth';
import { Brandmark } from '@/components/Brandmark';

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

const TIPO_LABEL: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  terreno: 'Terreno',
  comercial: 'Comercial',
};

export default function ImovelDetalhePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [imovel, setImovel] = useState<Imovel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [acao, setAcao] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    apiFetch<Imovel>(`/imoveis/${id}`, { token })
      .then(setImovel)
      .catch((err) => {
        setErro(err instanceof ApiRequestError ? err.message : 'Imóvel não encontrado.');
      });
  }, [id, router]);

  async function mudarStatus(status: 'ativo' | 'vendido') {
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
      <header className="topbar">
        <Brandmark />
        <Link href="/painel" className="auth-back">
          <span aria-hidden>←</span> Carteira
        </Link>
      </header>

      <div className="screen">
        {erro && <div className="banner banner-error">{erro}</div>}

        {!imovel ? (
          <p className="muted">Carregando…</p>
        ) : (
          <>
            {imovel.fotos && imovel.fotos.length > 0 ? (
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
              <h1 style={{ fontSize: '1.5rem' }}>{formatBRL(imovel.preco)}</h1>
              <span className={`badge ${imovel.finalidade === 'venda' ? 'badge-emerald' : 'badge-orange'}`}>
                {imovel.finalidade === 'venda' ? 'Venda' : 'Aluguel'}
              </span>
            </div>
            <p className="muted" style={{ marginTop: '0.25rem' }}>
              {TIPO_LABEL[imovel.tipo] ?? imovel.tipo}
              {imovel.status === 'vendido' && (
                <span className="badge badge-gray" style={{ marginLeft: '0.5rem' }}>Vendido</span>
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
              {imovel.status === 'vendido' ? (
                <button className="btn btn-emerald" disabled={acao} onClick={() => mudarStatus('ativo')}>
                  Reativar imóvel
                </button>
              ) : (
                <button className="btn btn-orange" disabled={acao} onClick={() => mudarStatus('vendido')}>
                  Marcar como vendido
                </button>
              )}
              <button className="btn btn-ghost" disabled={acao} onClick={excluir}>
                Remover da carteira
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
