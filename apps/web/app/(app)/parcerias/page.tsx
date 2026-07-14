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
      <div key={p.id} className="card" style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
          <strong>
            {TIPO_LABEL[p.imovel_tipo] ?? p.imovel_tipo} · {p.imovel_bairro}, {p.imovel_cidade}
          </strong>
          <span className={statusBadgeClass(p.status)}>{STATUS_LABEL[p.status] ?? p.status}</span>
        </div>
        <p className="muted" style={{ margin: '0.35rem 0', fontSize: '0.88rem' }}>
          {formatBRL(p.imovel_preco)} · Cliente: {p.cliente_nome}
          {comoCaptador ? '' : ` · Captador: ${p.captador_nome}`}
        </p>
        {p.recusa_motivo && (
          <p className="muted" style={{ margin: '0 0 0.5rem', fontSize: '0.82rem' }}>
            Motivo: {p.recusa_motivo}
          </p>
        )}
        <div className="row-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" style={{ width: 'auto', minHeight: 'auto', padding: '0.4rem 0.8rem' }} onClick={() => verContrato(p.id)}>
            Ver contrato
          </button>
          {['aceita', 'em_negociacao', 'encerrada'].includes(p.status) && (
            <Link className="btn btn-emerald" style={{ width: 'auto', minHeight: 'auto', padding: '0.4rem 0.8rem' }} href={`/parcerias/${p.id}`}>
              Abrir conversa
            </Link>
          )}
          {comoCaptador && p.status === 'solicitada' && (
            <>
              <button className="btn btn-emerald" style={{ width: 'auto', minHeight: 'auto', padding: '0.4rem 0.8rem' }} onClick={() => aceitar(p.id)}>
                Aceitar
              </button>
              <button className="btn btn-ghost" style={{ width: 'auto', minHeight: 'auto', padding: '0.4rem 0.8rem' }} onClick={() => recusar(p.id)}>
                Recusar
              </button>
            </>
          )}
          {!comoCaptador && ['solicitada', 'aceita'].includes(p.status) && (
            <button className="btn btn-ghost" style={{ width: 'auto', minHeight: 'auto', padding: '0.4rem 0.8rem', color: 'var(--error)' }} onClick={() => cancelar(p.id)}>
              Cancelar
            </button>
          )}
        </div>
        {contrato?.id === p.id && (
          <div className="card" style={{ marginTop: '0.75rem', background: 'var(--bg)', whiteSpace: 'pre-wrap', fontSize: '0.82rem', lineHeight: 1.5 }}>
            {contrato.texto}
            <p style={{ marginBottom: 0 }}>
              <button className="btn btn-ghost" style={{ width: 'auto', minHeight: 'auto', padding: '0.35rem 0.7rem', marginTop: '0.5rem' }} onClick={() => setContrato(null)}>
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
      <p className="muted" style={{ marginBottom: '1.25rem' }}>
        <Link href="/painel">← Voltar ao início</Link>
      </p>

        {erro && <div className="banner banner-error">{erro}</div>}

        {loading ? (
          <p className="muted">Carregando…</p>
        ) : (
          <>
            <h2 style={{ fontSize: '1.1rem' }}>
              Recebidas (meus imóveis)
              {recebidas.filter((p) => p.status === 'solicitada').length > 0 && (
                <span className="badge badge-orange" style={{ marginLeft: '0.5rem' }}>
                  {recebidas.filter((p) => p.status === 'solicitada').length} aguardando
                </span>
              )}
            </h2>
            {recebidas.length === 0 ? (
              <div className="card"><p className="muted" style={{ margin: 0 }}>Nenhuma solicitação recebida.</p></div>
            ) : (
              recebidas.map((p) => cardParceria(p, true))
            )}

            <h2 style={{ fontSize: '1.1rem', marginTop: '1.5rem' }}>Enviadas (meus clientes)</h2>
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
