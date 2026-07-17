'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { getAccessToken, getRole } from '@/lib/auth';
import { tempoRelativo } from '@/lib/format';
import { TIPO_LABEL, PARCERIA_STATUS_LABEL as STATUS_LABEL } from '@/lib/labels';

interface ConversaRow {
  id: string;
  status: string;
  imovel: { id: string; tipo: string; bairro: string; cidade: string };
  captador_nome: string;
  comprador_nome: string;
  total_mensagens: number;
  alertas: number;
  ultima_mensagem: { corpo: string; criado_em: string } | null;
}

export default function AdminConversasPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ConversaRow[]>([]);
  const [soAlertas, setSoAlertas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const token = getAccessToken();
    if (!token || getRole() !== 'equipe') {
      router.replace('/admin/login');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ data: ConversaRow[] }>('/admin/conversas', { token });
      setRows(res.data);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'UNAUTHENTICATED') {
        router.replace('/admin/login');
        return;
      }
      setErro('Não foi possível carregar as conversas.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const visiveis = soAlertas ? rows.filter((c) => c.alertas > 0) : rows;
  const totalAlertas = rows.filter((c) => c.alertas > 0).length;

  return (
    <>
      <h1 style={{ fontSize: '1.5rem' }}>Conversas ({rows.length})</h1>
      <p className="muted" style={{ marginTop: '-0.25rem' }}>
        A equipe acompanha os chats entre parceiros. Conversas com ⚠️ tiveram menções que podem
        indicar tentativa de contato/negociação por fora da plataforma.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn ${soAlertas ? 'btn-ghost' : 'btn-emerald'}`}
          style={{ width: 'auto', minHeight: 'auto', padding: '0.4rem 0.8rem' }}
          onClick={() => setSoAlertas(false)}
        >
          Todas
        </button>
        <button
          type="button"
          className={`btn ${soAlertas ? 'btn-emerald' : 'btn-ghost'}`}
          style={{ width: 'auto', minHeight: 'auto', padding: '0.4rem 0.8rem' }}
          onClick={() => setSoAlertas(true)}
        >
          ⚠️ Com alerta ({totalAlertas})
        </button>
      </div>

      {erro && <div className="banner banner-error">{erro}</div>}
      {loading ? (
        <p className="muted">Carregando…</p>
      ) : visiveis.length === 0 ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>Nenhuma conversa encontrada.</p></div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Imóvel</th>
              <th>Parceiros</th>
              <th>Status</th>
              <th>Msgs</th>
              <th>Última</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.alertas > 0 && <span title={`${c.alertas} mensagem(ns) sinalizada(s)`}>⚠️ </span>}
                  {TIPO_LABEL[c.imovel.tipo] ?? c.imovel.tipo} · {c.imovel.bairro}, {c.imovel.cidade}
                </td>
                <td>{c.captador_nome} ↔ {c.comprador_nome}</td>
                <td><span className="badge badge-gray">{STATUS_LABEL[c.status] ?? c.status}</span></td>
                <td>{c.total_mensagens}</td>
                <td>{c.ultima_mensagem ? tempoRelativo(c.ultima_mensagem.criado_em) : '—'}</td>
                <td>
                  <Link className="btn btn-ghost" style={{ width: 'auto', minHeight: 'auto', padding: '0.35rem 0.7rem' }} href={`/admin/conversas/${c.id}`}>
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
