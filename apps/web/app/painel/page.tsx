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
        return apiFetch<{ data: Imovel[] }>('/imoveis/me', { token })
          .then((res) => setImoveis(res.data))
          .catch(() => setImoveis([]));
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  function sair() {
    clearSession();
    router.replace('/login');
  }

  return (
    <div className="frame frame-app">
      <header className="topbar">
        <Brandmark />
        <nav className="desktop-nav">
          <Link href="/painel" className="active">Início</Link>
          <Link href="/vitrine">Vitrine</Link>
          <Link href="/painel">Demandas</Link>
          <Link href="/painel">Matches</Link>
          <Link href="/painel">Agenda</Link>
        </nav>
        <button className="btn btn-ghost" style={{ width: 'auto', minHeight: 'auto', padding: '0.45rem 0.9rem' }} onClick={sair}>
          Sair
        </button>
      </header>

      <div className="screen has-bottomnav">
        <h1 style={{ fontSize: '1.5rem' }}>Olá{me ? `, ${me.nome.split(' ')[0]}` : ''}!</h1>
        <p className="muted" style={{ marginBottom: '1.25rem' }}>Seu perfil está ativo e verificado.</p>

        <div className="carteira-head">
          <h2 className="carteira-title">Meus imóveis</h2>
          <Link href="/imoveis/novo" className="btn btn-emerald" style={{ width: 'auto', minHeight: 'auto', padding: '0.55rem 1rem' }}>
            + Cadastrar imóvel
          </Link>
        </div>

        {imoveis === null ? (
          <p className="muted">Carregando sua carteira…</p>
        ) : imoveis.length === 0 ? (
          <div className="card empty-state">
            <span className="empty-ico">🏠</span>
            <h3 style={{ textTransform: 'uppercase', fontWeight: 800 }}>Sua carteira está vazia</h3>
            <p className="muted" style={{ margin: '0.35rem 0 1rem' }}>
              Cadastre seu primeiro imóvel para começar a fechar parcerias.
            </p>
            <Link href="/imoveis/novo" className="btn btn-emerald" style={{ width: 'auto' }}>
              Cadastrar imóvel
            </Link>
          </div>
        ) : (
          <div className="imovel-list">
            {imoveis.map((im) => (
              <Link key={im.id} href={`/imoveis/${im.id}`} className="imovel-card">
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
                    {im.status !== 'ativo' && (
                      <span
                        className={`badge ${im.status === 'em_negociacao' ? 'badge-orange' : 'badge-gray'}`}
                      >
                        {STATUS_LABEL[im.status] ?? im.status}
                      </span>
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
            ))}
          </div>
        )}
      </div>

      <BottomNav active="inicio" />
    </div>
  );
}
