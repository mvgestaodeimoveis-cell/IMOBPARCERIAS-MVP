'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { formatBRL } from '@/lib/masks';
import { clearSession, getAccessToken, getRole } from '@/lib/auth';
import { Brandmark } from '@/components/Brandmark';

interface Metricas {
  corretores: { total: number; ativos: number; pendentes: number };
  imoveis: { total: number; na_vitrine: number; em_negociacao: number; vendidos: number };
  parcerias: {
    total: number;
    iniciadas: number;
    confirmacoes_bilaterais: number;
    vendas: number;
    volume_vendas: number;
    taxa_total: number;
    taxa_recebida: number;
    taxa_pendente: number;
  };
}

function Card({ label, valor, meta, sub }: { label: string; valor: string | number; meta?: string; sub?: string }) {
  return (
    <div className="card" style={{ margin: 0 }}>
      <p className="muted" style={{ margin: 0, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ margin: '0.25rem 0 0', fontSize: '1.6rem', fontWeight: 800 }}>{valor}</p>
      {sub && <p className="muted" style={{ margin: '0.15rem 0 0', fontSize: '0.82rem' }}>{sub}</p>}
      {meta && <p className="muted" style={{ margin: '0.15rem 0 0', fontSize: '0.75rem' }}>Meta 1º mês: {meta}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [m, setM] = useState<Metricas | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const token = getAccessToken();
    if (!token || getRole() !== 'equipe') {
      router.replace('/admin/login');
      return;
    }
    try {
      setM(await apiFetch<Metricas>('/admin/metricas', { token }));
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'UNAUTHENTICATED') {
        router.replace('/admin/login');
        return;
      }
      setErro('Não foi possível carregar as métricas.');
    }
  }, [router]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function sair() {
    clearSession();
    router.replace('/admin/login');
  }

  return (
    <div className="frame frame-app">
      <header className="topbar">
        <span className="brand-link">
          <Brandmark />
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="muted" style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Equipe</span>
          <button className="btn btn-ghost" style={{ width: 'auto', minHeight: 'auto', padding: '0.45rem 0.9rem' }} onClick={sair}>Sair</button>
        </div>
      </header>
      <div className="screen">
        <h1 style={{ fontSize: '1.5rem' }}>Painel da equipe</h1>
        <p style={{ marginBottom: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/admin/corretores">Verificação de CRECI →</Link>
          <Link href="/admin/exclusividades">Exclusividades →</Link>
          <Link href="/admin/pagamentos">Pagamentos →</Link>
          <Link href="/admin/equipe">Administradores →</Link>
        </p>

        {erro && <div className="banner banner-error">{erro}</div>}
        {!m ? (
          !erro && <p className="muted">Carregando…</p>
        ) : (
          <>
            <h2 style={{ fontSize: '1.05rem' }}>Corretores</h2>
            <div className="metricas-grid">
              <Card label="Total" valor={m.corretores.total} meta="100" />
              <Card label="Ativos" valor={m.corretores.ativos} meta="50 captadores" />
              <Card label="Pendentes" valor={m.corretores.pendentes} sub="aguardando CRECI" />
            </div>

            <h2 style={{ fontSize: '1.05rem', marginTop: '1.5rem' }}>Imóveis</h2>
            <div className="metricas-grid">
              <Card label="Na vitrine" valor={m.imoveis.na_vitrine} meta="300–400" />
              <Card label="Total cadastrados" valor={m.imoveis.total} />
              <Card label="Em negociação" valor={m.imoveis.em_negociacao} />
              <Card label="Vendidos" valor={m.imoveis.vendidos} />
            </div>

            <h2 style={{ fontSize: '1.05rem', marginTop: '1.5rem' }}>Parcerias</h2>
            <div className="metricas-grid">
              <Card label="Iniciadas (match aceito)" valor={m.parcerias.iniciadas} meta="20" />
              <Card label="Confirmações bilaterais" valor={m.parcerias.confirmacoes_bilaterais} meta="10" />
              <Card label="Vendas declaradas" valor={m.parcerias.vendas} meta="1" />
              <Card label="Solicitações totais" valor={m.parcerias.total} />
            </div>

            <h2 style={{ fontSize: '1.05rem', marginTop: '1.5rem' }}>Financeiro (taxa da plataforma)</h2>
            <div className="metricas-grid">
              <Card label="Volume de vendas" valor={formatBRL(m.parcerias.volume_vendas)} />
              <Card label="Taxa recebida" valor={formatBRL(m.parcerias.taxa_recebida)} />
              <Card label="Taxa a receber" valor={formatBRL(m.parcerias.taxa_pendente)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
