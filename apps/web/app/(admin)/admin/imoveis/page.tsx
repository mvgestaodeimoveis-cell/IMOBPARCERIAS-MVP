'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { formatBRL } from '@/lib/masks';
import { getAccessToken, getRole } from '@/lib/auth';
import { TIPO_LABEL, IMOVEL_STATUS_LABEL as STATUS_LABEL } from '@/lib/labels';

interface ImovelRow {
  id: string;
  tipo: string;
  finalidade: string;
  preco: number;
  cidade: string;
  bairro: string;
  status: string;
  exclusividade_status: string;
  corretor_nome: string;
  corretor_creci: string | null;
  criado_em: string;
}

const STATUS = ['', 'ativo', 'em_negociacao', 'vendido', 'inativo'];

// Status por cores (feedback cliente): disponível=verde, em negociação=amarelo,
// vendido=vermelho, inativo=cinza.
const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  ativo: { cls: 'badge-emerald', label: 'Disponível' },
  em_negociacao: { cls: 'badge-amber', label: 'Em negociação' },
  vendido: { cls: 'badge-red', label: 'Vendido' },
  inativo: { cls: 'badge-gray', label: 'Inativo' },
};

export default function AdminImoveisPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ImovelRow[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
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
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (busca.trim()) params.set('busca', busca.trim());
      const res = await apiFetch<{ data: ImovelRow[]; total: number }>(
        `/admin/imoveis?${params.toString()}`,
        { token },
      );
      setRows(res.data);
      setTotal(res.total);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'UNAUTHENTICATED') {
        router.replace('/admin/login');
        return;
      }
      setErro('Não foi possível carregar os imóveis.');
    } finally {
      setLoading(false);
    }
  }, [router, status, busca]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function acao(id: string, op: 'desabilitar' | 'reativar' | 'excluir') {
    const token = getAccessToken();
    if (op === 'excluir' && !window.confirm('Excluir definitivamente este imóvel? Esta ação não pode ser desfeita.')) return;
    try {
      if (op === 'excluir') {
        await apiFetch(`/admin/imoveis/${id}`, { method: 'DELETE', token });
      } else {
        await apiFetch(`/admin/imoveis/${id}/${op}`, { method: 'POST', token });
      }
      carregar();
    } catch (err) {
      alert(err instanceof ApiRequestError ? err.message : 'Erro na operação.');
    }
  }

  return (
    <>
      <h1 style={{ fontSize: '1.5rem' }}>Imóveis ({total})</h1>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <select className="input" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS.map((s) => (
              <option key={s} value={s}>{s ? STATUS_LABEL[s] : 'Todos os status'}</option>
            ))}
          </select>
          <input
            className="input"
            style={{ flex: 1, minWidth: 180 }}
            placeholder="Buscar por bairro ou corretor…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {erro && <div className="banner banner-error">{erro}</div>}
        {loading ? (
          <p className="muted">Carregando…</p>
        ) : rows.length === 0 ? (
          <div className="card"><p className="muted" style={{ margin: 0 }}>Nenhum imóvel encontrado.</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Imóvel</th>
                <th>Corretor</th>
                <th>Preço</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((im) => (
                <tr key={im.id}>
                  <td>
                    {TIPO_LABEL[im.tipo] ?? im.tipo} · {im.bairro}, {im.cidade}
                    <span className={`badge ${im.finalidade === 'venda' ? 'badge-emerald' : 'badge-orange'}`} style={{ marginLeft: '0.4rem' }}>
                      {im.finalidade === 'venda' ? 'Venda' : 'Aluguel'}
                    </span>
                    {im.exclusividade_status === 'verificada' && <span className="badge badge-emerald" style={{ marginLeft: '0.4rem' }}>✓ Excl.</span>}
                  </td>
                  <td>{im.corretor_nome}</td>
                  <td>{formatBRL(im.preco)}</td>
                  <td>
                    <span className={`badge badge-dot ${STATUS_BADGE[im.status]?.cls ?? 'badge-gray'}`}>
                      {STATUS_BADGE[im.status]?.label ?? (STATUS_LABEL[im.status] ?? im.status)}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {im.status === 'inativo' ? (
                        <button className="btn btn-emerald" style={{ width: 'auto', minHeight: 'auto', padding: '0.35rem 0.7rem' }} onClick={() => acao(im.id, 'reativar')}>Reativar</button>
                      ) : (
                        <button className="btn btn-ghost" style={{ width: 'auto', minHeight: 'auto', padding: '0.35rem 0.7rem' }} onClick={() => acao(im.id, 'desabilitar')}>Desabilitar</button>
                      )}
                      <button className="btn btn-ghost" style={{ width: 'auto', minHeight: 'auto', padding: '0.35rem 0.7rem', color: 'var(--error)' }} onClick={() => acao(im.id, 'excluir')}>Excluir</button>
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
