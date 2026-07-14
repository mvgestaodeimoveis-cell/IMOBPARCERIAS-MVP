'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { formatBRL } from '@/lib/masks';
import { getAccessToken, getRole } from '@/lib/auth';

interface Pagamento {
  id: string;
  imovel_tipo: string;
  imovel_bairro: string;
  imovel_cidade: string;
  captador_nome: string;
  comprador_nome: string;
  venda_valor: number;
  taxa_plataforma: number;
  pagamento_vencimento: string;
}

export default function AdminPagamentosPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Pagamento[]>([]);
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
      const res = await apiFetch<{ data: Pagamento[] }>('/admin/pagamentos', { token });
      setRows(res.data);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'UNAUTHENTICATED') {
        router.replace('/admin/login');
        return;
      }
      setErro('Não foi possível carregar os pagamentos.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function confirmar(id: string) {
    if (!window.confirm('Confirmar o recebimento da taxa desta parceria?')) return;
    const token = getAccessToken();
    try {
      await apiFetch(`/admin/parcerias/${id}/pagamento`, { method: 'POST', token });
      setRows((r) => r.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof ApiRequestError ? err.message : 'Erro ao confirmar.');
    }
  }

  return (
    <>
      <h1 style={{ fontSize: '1.5rem' }}>Pagamentos de taxa (PIX)</h1>
      <p className="muted" style={{ marginBottom: '1.25rem' }}>Confirme o recebimento da taxa da plataforma.</p>

        {erro && <div className="banner banner-error">{erro}</div>}
        {loading ? (
          <p className="muted">Carregando…</p>
        ) : rows.length === 0 ? (
          <div className="card"><p className="muted" style={{ margin: 0 }}>Nenhum pagamento pendente.</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Imóvel</th>
                <th>Captador</th>
                <th>Venda</th>
                <th>Taxa</th>
                <th>Vencimento</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{p.imovel_tipo} · {p.imovel_bairro}</td>
                  <td>{p.captador_nome}</td>
                  <td>{formatBRL(p.venda_valor)}</td>
                  <td>{formatBRL(p.taxa_plataforma)}</td>
                  <td>{new Date(p.pagamento_vencimento).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <button className="btn btn-emerald" style={{ width: 'auto', minHeight: 'auto', padding: '0.4rem 0.8rem' }} onClick={() => confirmar(p.id)}>
                      Confirmar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </>
  );
}
