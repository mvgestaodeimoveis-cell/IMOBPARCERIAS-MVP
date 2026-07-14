'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { formatBRL } from '@/lib/masks';
import { getAccessToken } from '@/lib/auth';
import { TIPO_LABEL, PARCERIA_STATUS_LABEL as STATUS_LABEL } from '@/lib/labels';

interface Parceria {
  id: string;
  imovel_id: string;
  status: string;
  cliente_nome: string;
  imovel_tipo: string;
  imovel_bairro: string;
  imovel_cidade: string;
  imovel_preco: number;
  captador_nome: string;
  comprador_nome: string;
  recusa_motivo: string | null;
  criado_em: string;
}


function statusBadgeClass(status: string): string {
  if (status === 'aceita' || status === 'vendida') return 'badge badge-emerald';
  if (status === 'solicitada' || status === 'em_negociacao') return 'badge badge-orange';
  return 'badge';
}

export default function ParceriasPage() {
  const router = useRouter();
  const [recebidas, setRecebidas] = useState<Parceria[]>([]);
  const [enviadas, setEnviadas] = useState<Parceria[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [contrato, setContrato] = useState<{ id: string; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setLoading(true);
    try {
      const [rec, env] = await Promise.all([
        apiFetch<{ data: Parceria[] }>('/parcerias/recebidas', { token }),
        apiFetch<{ data: Parceria[] }>('/parcerias/enviadas', { token }),
      ]);
      setRecebidas(rec.data);
      setEnviadas(env.data);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'UNAUTHENTICATED') {
        router.replace('/login');
        return;
      }
      setErro('Não foi possível carregar suas parcerias.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function aceitar(id: string) {
    const token = getAccessToken();
    try {
      await apiFetch(`/parcerias/${id}/aceitar`, { method: 'POST', token });
      carregar();
    } catch (err) {
      alert(err instanceof ApiRequestError ? err.message : 'Erro ao aceitar.');
    }
  }

  async function recusar(id: string) {
    const motivo = window.prompt('Motivo da recusa (opcional):') ?? undefined;
    const token = getAccessToken();
    try {
      await apiFetch(`/parcerias/${id}/recusar`, { method: 'POST', token, body: { motivo } });
      carregar();
    } catch (err) {
      alert(err instanceof ApiRequestError ? err.message : 'Erro ao recusar.');
    }
  }

  async function cancelar(id: string) {
    if (!window.confirm('Cancelar esta solicitação de parceria?')) return;
    const token = getAccessToken();
    try {
      await apiFetch(`/parcerias/${id}/cancelar`, { method: 'POST', token });
      carregar();
    } catch (err) {
      alert(err instanceof ApiRequestError ? err.message : 'Erro ao cancelar.');
    }
  }

  async function verContrato(id: string) {
    const token = getAccessToken();
    try {
      const res = await apiFetch<{ texto: string }>(`/parcerias/${id}/contrato`, { token });
      setContrato({ id, texto: res.texto });
    } catch {
      alert('Não foi possível carregar o contrato.');
    }
  }

  function cardParceria(p: Parceria, comoCaptador: boolean) {
    return (
      <div key={p.id} className="card parceria-card">
        <div className="parceria-card-head">
          <div className="parceria-card-titulo">
            <strong>{TIPO_LABEL[p.imovel_tipo] ?? p.imovel_tipo} · {p.imovel_bairro}</strong>
            <span className="muted">{p.imovel_cidade}</span>
          </div>
          <span className={statusBadgeClass(p.status)}>{STATUS_LABEL[p.status] ?? p.status}</span>
        </div>
        <div className="parceria-card-meta">
          <span className="parceria-preco">{formatBRL(p.imovel_preco)}</span>
          <span className="muted">Cliente: {p.cliente_nome}</span>
          {!comoCaptador && <span className="muted">Captador: {p.captador_nome}</span>}
        </div>
        {p.recusa_motivo && (
          <p className="muted parceria-motivo">Motivo: {p.recusa_motivo}</p>
        )}
        <div className="parceria-card-acoes">
          <button className="btn btn-ghost btn-sm" onClick={() => verContrato(p.id)}>
            Ver contrato
          </button>
          {['aceita', 'em_negociacao', 'encerrada'].includes(p.status) && (
            <Link className="btn btn-emerald btn-sm" href={`/parcerias/${p.id}`}>
              Abrir conversa
            </Link>
          )}
          {comoCaptador && p.status === 'solicitada' && (
            <>
              <button className="btn btn-emerald btn-sm" onClick={() => aceitar(p.id)}>
                Aceitar
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => recusar(p.id)}>
                Recusar
              </button>
            </>
          )}
          {!comoCaptador && ['solicitada', 'aceita'].includes(p.status) && (
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => cancelar(p.id)}>
              Cancelar
            </button>
          )}
        </div>
        {contrato?.id === p.id && (
          <div className="card" style={{ marginTop: '0.75rem', background: 'var(--bg)', whiteSpace: 'pre-wrap', fontSize: '0.82rem', lineHeight: 1.5 }}>
            {contrato.texto}
            <p style={{ marginBottom: 0 }}>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => setContrato(null)}>
                Fechar
              </button>
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <h1 style={{ fontSize: '1.5rem' }}>Minhas parcerias</h1>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Solicitações que você recebeu e enviou.
      </p>

        {erro && <div className="banner banner-error">{erro}</div>}

        {loading ? (
          <p className="muted">Carregando…</p>
        ) : (
          <>
            <div className="parceria-secao">
              <h2>Recebidas</h2>
              <span className="parceria-secao-sub">nos meus imóveis</span>
              {recebidas.filter((p) => p.status === 'solicitada').length > 0 && (
                <span className="badge badge-orange">
                  {recebidas.filter((p) => p.status === 'solicitada').length} aguardando
                </span>
              )}
            </div>
            {recebidas.length === 0 ? (
              <div className="card"><p className="muted" style={{ margin: 0 }}>Nenhuma solicitação recebida.</p></div>
            ) : (
              recebidas.map((p) => cardParceria(p, true))
            )}

            <div className="parceria-secao" style={{ marginTop: '1.75rem' }}>
              <h2>Enviadas</h2>
              <span className="parceria-secao-sub">para imóveis de parceiros</span>
            </div>
            {enviadas.length === 0 ? (
              <div className="card"><p className="muted" style={{ margin: 0 }}>Você ainda não solicitou parcerias.</p></div>
            ) : (
              enviadas.map((p) => cardParceria(p, false))
            )}
          </>
        )}
    </>
  );
}
