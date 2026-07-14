'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatBRL } from '@/lib/masks';
import { clearSession, getAccessToken, routeForStatus } from '@/lib/auth';
import { Brandmark } from '@/components/Brandmark';
import { BottomNav } from '@/components/BottomNav';

interface Me {
  nome: string;
  papel: string;
  status: string;
}

interface Imovel {
  id: string;
  finalidade: string;
  tipo: string;
  preco: number;
  cidade: string;
  bairro: string;
  status: string;
  quartos: number | null;
  vagas: number | null;
  area_m2: number | null;
  fotos: string[];
  exclusividade: boolean;
  exclusividade_status: string;
}

const TIPO_LABEL: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  terreno: 'Terreno',
  comercial: 'Comercial',
};

const STATUS_LABEL: Record<string, string> = {
  ativo: 'Disponível',
  em_negociacao: 'Em negociação',
  vendido: 'Vendido',
  inativo: 'Inativo',
};

export default function AppHomePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [imoveis, setImoveis] = useState<Imovel[] | null>(null);
  const [pendentes, setPendentes] = useState(0);
  const [acaoId, setAcaoId] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    apiFetch<Me>('/corretores/me', { token })
      .then((data) => {
        if (data.status !== 'ativo') {
          router.replace(routeForStatus(data.status));
          return;
        }
        setMe(data);
        apiFetch<{ data: { status: string }[] }>('/parcerias/recebidas', { token })
          .then((res) => setPendentes(res.data.filter((p) => p.status === 'solicitada').length))
          .catch(() => setPendentes(0));
        return apiFetch<{ data: Imovel[] }>('/imoveis/me', { token })
          .then((res) => setImoveis(res.data))
          .catch(() => setImoveis([]));
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  async function marcarVendido(id: string) {
    if (!window.confirm('Confirmar que este imóvel foi vendido? Ele sairá da vitrine.')) return;
    const token = getAccessToken();
    if (!token) return;
    setAcaoId(id);
    try {
      const atualizado = await apiFetch<Imovel>(`/imoveis/${id}`, {
        method: 'PATCH',
        token,
        body: { status: 'vendido' },
      });
      setImoveis((atual) =>
        atual ? atual.map((im) => (im.id === id ? { ...im, status: atualizado.status } : im)) : atual,
      );
    } catch {
      window.alert('Não foi possível atualizar o imóvel. Tente novamente.');
    } finally {
      setAcaoId(null);
    }
  }

  function sair() {
    clearSession();
    router.replace('/login');
  }

  const total = imoveis?.length ?? 0;
  const disponiveis = imoveis?.filter((im) => im.status === 'ativo').length ?? 0;
  const emNegociacao = imoveis?.filter((im) => im.status === 'em_negociacao').length ?? 0;

  return (
    <div className="frame frame-app">
      <header className="topbar">
        <Brandmark />
        <nav className="desktop-nav">
          <Link href="/painel" className="active">Início</Link>
          <Link href="/vitrine">Vitrine</Link>
          <Link href="/parcerias">Parcerias{pendentes > 0 ? ` (${pendentes})` : ''}</Link>
        </nav>
        <button className="btn btn-ghost" style={{ width: 'auto', minHeight: 'auto', padding: '0.45rem 0.9rem' }} onClick={sair}>
          Sair
        </button>
      </header>

      <div className="screen has-bottomnav">
        <h1 style={{ fontSize: '1.5rem' }}>Olá{me ? `, ${me.nome.split(' ')[0]}` : ''}!</h1>
        <p className="muted" style={{ marginBottom: '1.1rem' }}>Seu perfil está ativo e verificado.</p>

        {imoveis !== null && (
          <div className="painel-stats">
            <div className="stat-chip">
              <span className="stat-num">{total}</span>
              <span className="stat-label">imóvel(is)</span>
            </div>
            <div className="stat-chip">
              <span className="stat-num" style={{ color: 'var(--emerald-600)' }}>{disponiveis}</span>
              <span className="stat-label">na vitrine</span>
            </div>
            {emNegociacao > 0 && (
              <div className="stat-chip">
                <span className="stat-num" style={{ color: 'var(--orange-600)' }}>{emNegociacao}</span>
                <span className="stat-label">em negociação</span>
              </div>
            )}
            <div className="stat-chip">
              <span className="stat-num" style={{ color: pendentes > 0 ? 'var(--orange-600)' : undefined }}>{pendentes}</span>
              <span className="stat-label">parceria(s) pendente(s)</span>
            </div>
          </div>
        )}

        <div className="carteira-head" style={{ marginTop: '1.25rem' }}>
          <h2 className="carteira-title">Meus imóveis</h2>
          <Link href="/imoveis/novo" className="btn btn-emerald carteira-cta">
            + Cadastrar imóvel
          </Link>
        </div>

        {imoveis === null ? (
          <p className="muted">Carregando sua carteira…</p>
        ) : imoveis.length === 0 ? (
          <div className="card empty-state">
            <span className="empty-ico">🏠</span>
            <h3 style={{ textTransform: 'uppercase', fontWeight: 800 }}>Comece a fechar parcerias</h3>
            <p className="muted" style={{ margin: '0.35rem auto 1rem', maxWidth: '32ch' }}>
              Cadastre seu primeiro imóvel para aparecer na vitrine e receber solicitações de outros corretores.
            </p>
            <Link href="/imoveis/novo" className="btn btn-emerald" style={{ width: 'auto' }}>
              Cadastrar meu primeiro imóvel
            </Link>
            <p style={{ marginTop: '0.9rem' }}>
              <Link href="/vitrine" className="muted">Ou explore a vitrine de parceiros →</Link>
            </p>
          </div>
        ) : (
          <div className="imovel-list">
            {imoveis.map((im) => (
              <div key={im.id} className="imovel-card">
                <Link href={`/imoveis/${im.id}`} className="imovel-card-body">
                  <div className="imovel-thumb" aria-hidden>
                    {im.fotos && im.fotos.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={im.fotos[0]} alt="" />
                    ) : (
                      '🏠'
                    )}
                  </div>
                  <div className="imovel-info">
                    <div className="imovel-top">
                      <strong>{formatBRL(im.preco)}</strong>
                      <span className={`badge ${im.finalidade === 'venda' ? 'badge-emerald' : 'badge-orange'}`}>
                        {im.finalidade === 'venda' ? 'Venda' : 'Aluguel'}
                      </span>
                    </div>
                    <div className="imovel-tags">
                      {im.status !== 'ativo' && (
                        <span className={`badge ${im.status === 'em_negociacao' ? 'badge-orange' : 'badge-gray'}`}>
                          {STATUS_LABEL[im.status] ?? im.status}
                        </span>
                      )}
                      {im.exclusividade && im.exclusividade_status === 'verificada' && (
                        <span className="badge badge-emerald">★ Exclusivo</span>
                      )}
                      {im.exclusividade && im.exclusividade_status !== 'verificada' && (
                        <span className="badge badge-gray">Exclusiv. em análise</span>
                      )}
                    </div>
                    <p className="imovel-sub">
                      {TIPO_LABEL[im.tipo] ?? im.tipo} · {im.bairro}, {im.cidade}
                    </p>
                    <p className="imovel-meta">
                      {[
                        im.area_m2 ? `${im.area_m2} m²` : null,
                        im.quartos != null ? `${im.quartos} quarto(s)` : null,
                        im.vagas != null ? `${im.vagas} vaga(s)` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Sem detalhes adicionais'}
                    </p>
                  </div>
                </Link>
                <div className="imovel-actions">
                  <Link href={`/imoveis/${im.id}`} className="imovel-action">
                    Editar
                  </Link>
                  {im.status !== 'vendido' && (
                    <button
                      type="button"
                      className="imovel-action imovel-action-emerald"
                      disabled={acaoId === im.id}
                      onClick={() => marcarVendido(im.id)}
                    >
                      {acaoId === im.id ? '…' : 'Marcar vendido'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav active="inicio" />
    </div>
  );
}
