'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { clearSession, getAccessToken, getRole } from '@/lib/auth';
import { Brandmark } from '@/components/Brandmark';

interface CorretorRow {
  id: string;
  nome: string;
  creci: string;
  cidade: string;
  status: string;
  criado_em: string;
}

interface ListResponse {
  data: CorretorRow[];
  total: number;
}

const STATUS_LABEL: Record<string, string> = {
  verificacao_pendente: 'Pendente',
  ativo: 'Ativo',
  rejeitado: 'Rejeitado',
  suspenso: 'Suspenso',
  cadastro_incompleto: 'Incompleto',
};

const STATUS_FILTROS = ['verificacao_pendente', 'ativo', 'suspenso', 'rejeitado', ''];

export default function AdminCorretoresPage() {
  const router = useRouter();
  const [rows, setRows] = useState<CorretorRow[]>([]);
  const [status, setStatus] = useState('verificacao_pendente');
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
      const res = await apiFetch<ListResponse>(`/admin/corretores?${params.toString()}`, { token });
      setRows(res.data);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'UNAUTHENTICATED') {
        router.replace('/admin/login');
        return;
      }
      setErro('Não foi possível carregar a lista.');
    } finally {
      setLoading(false);
    }
  }, [router, status, busca]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function aprovar(id: string) {
    const token = getAccessToken();
    await apiFetch(`/admin/corretores/${id}/aprovar`, { method: 'POST', token });
    carregar();
  }

  async function rejeitar(id: string) {
    const motivo = window.prompt('Motivo da rejeição:');
    if (!motivo) return;
    const token = getAccessToken();
    try {
      await apiFetch(`/admin/corretores/${id}/rejeitar`, { method: 'POST', token, body: { motivo } });
      carregar();
    } catch (err) {
      alert(err instanceof ApiRequestError ? err.message : 'Erro ao rejeitar.');
    }
  }

  async function moderar(id: string, op: 'suspender' | 'reativar') {
    const token = getAccessToken();
    try {
      await apiFetch(`/admin/corretores/${id}/${op}`, { method: 'POST', token });
      carregar();
    } catch (err) {
      alert(err instanceof ApiRequestError ? err.message : 'Erro na operação.');
    }
  }

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
          <span className="muted" style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Equipe
          </span>
          <button
            className="btn btn-ghost"
            style={{ width: 'auto', minHeight: 'auto', padding: '0.45rem 0.9rem' }}
            onClick={sair}
          >
            Sair
          </button>
        </div>
      </header>
      <div className="screen">
        <h1 style={{ fontSize: '1.5rem' }}>Corretores</h1>
        <p style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a href="/admin/dashboard">Painel →</a>
          <a href="/admin/imoveis">Imóveis →</a>
          <a href="/admin/exclusividades">Exclusividades →</a>
          <a href="/admin/pagamentos">Pagamentos →</a>
          <a href="/admin/equipe">Administradores →</a>
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <select className="input" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_FILTROS.map((s) => (
              <option key={s} value={s}>{s ? STATUS_LABEL[s] : 'Todos'}</option>
            ))}
          </select>
          <input
            className="input"
            style={{ flex: 1, minWidth: 180 }}
            placeholder="Buscar por nome, e-mail ou CRECI…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {erro && <div className="banner banner-error">{erro}</div>}
        {loading ? (
          <p className="muted">Carregando...</p>
        ) : rows.length === 0 ? (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>Nenhum corretor encontrado.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>CRECI</th>
                <th>Cidade</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{c.creci}</td>
                  <td>{c.cidade}</td>
                  <td>{STATUS_LABEL[c.status] ?? c.status}</td>
                  <td>
                    <div className="row-actions" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {c.status === 'verificacao_pendente' && (
                        <>
                          <button className="btn btn-emerald" style={{ width: 'auto', minHeight: 'auto', padding: '0.35rem 0.7rem' }} onClick={() => aprovar(c.id)}>Aprovar</button>
                          <button className="btn btn-ghost" style={{ width: 'auto', minHeight: 'auto', padding: '0.35rem 0.7rem' }} onClick={() => rejeitar(c.id)}>Rejeitar</button>
                        </>
                      )}
                      {c.status === 'ativo' && (
                        <button className="btn btn-ghost" style={{ width: 'auto', minHeight: 'auto', padding: '0.35rem 0.7rem', color: 'var(--error)' }} onClick={() => moderar(c.id, 'suspender')}>Suspender</button>
                      )}
                      {c.status === 'suspenso' && (
                        <button className="btn btn-emerald" style={{ width: 'auto', minHeight: 'auto', padding: '0.35rem 0.7rem' }} onClick={() => moderar(c.id, 'reativar')}>Reativar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
