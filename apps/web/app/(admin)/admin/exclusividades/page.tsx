'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { getAccessToken, getRole } from '@/lib/auth';
import { formatBRL } from '@/lib/masks';

interface ExclusividadeRow {
  id: string;
  bairro: string;
  cidade: string;
  tipo: string;
  preco: number;
  exclusividade_contrato_url: string | null;
  exclusividade_vencimento: string | null;
  corretor_nome: string;
  corretor_creci: string | null;
  criado_em: string;
}

interface ListResponse {
  data: ExclusividadeRow[];
}

export default function AdminExclusividadesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ExclusividadeRow[]>([]);
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
      const res = await apiFetch<ListResponse>('/admin/exclusividades', { token });
      setRows(res.data);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'UNAUTHENTICATED') {
        router.replace('/admin/login');
        return;
      }
      setErro('Não foi possível carregar a fila.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function verificar(id: string) {
    const token = getAccessToken();
    try {
      await apiFetch(`/admin/exclusividades/${id}/verificar`, { method: 'POST', token });
      setRows((r) => r.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof ApiRequestError ? err.message : 'Erro ao verificar.');
    }
  }

  async function rejeitar(id: string) {
    if (!window.confirm('Rejeitar a exclusividade deste imóvel?')) return;
    const token = getAccessToken();
    try {
      await apiFetch(`/admin/exclusividades/${id}/rejeitar`, { method: 'POST', token });
      setRows((r) => r.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof ApiRequestError ? err.message : 'Erro ao rejeitar.');
    }
  }

  return (
    <>
      <h1 style={{ fontSize: '1.5rem' }}>Verificação de exclusividade</h1>
      <p className="muted" style={{ marginBottom: '1.25rem' }}>Contratos de exclusividade aguardando análise.</p>

        {erro && <div className="banner banner-error">{erro}</div>}
        {loading ? (
          <p className="muted">Carregando...</p>
        ) : rows.length === 0 ? (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>Nenhuma exclusividade pendente no momento.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Imóvel</th>
                <th>Corretor</th>
                <th>Vencimento</th>
                <th>Contrato</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.tipo} · {c.bairro}, {c.cidade}
                    <br />
                    <span className="muted">{formatBRL(c.preco)}</span>
                  </td>
                  <td>
                    {c.corretor_nome}
                    <br />
                    <span className="muted">CRECI {c.corretor_creci ?? '—'}</span>
                  </td>
                  <td>
                    {c.exclusividade_vencimento
                      ? new Date(`${c.exclusividade_vencimento}T00:00:00`).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td>
                    {c.exclusividade_contrato_url ? (
                      <a href={c.exclusividade_contrato_url} target="_blank" rel="noreferrer">
                        Abrir
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-emerald" onClick={() => verificar(c.id)}>
                        Verificar
                      </button>
                      <button className="btn btn-ghost" onClick={() => rejeitar(c.id)}>
                        Rejeitar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </>
  );
}
