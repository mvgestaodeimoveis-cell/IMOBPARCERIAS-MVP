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

export default function AdminCorretoresPage() {
  const router = useRouter();
  const [rows, setRows] = useState<CorretorRow[]>([]);
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
      const res = await apiFetch<ListResponse>('/admin/corretores?status=verificacao_pendente', {
        token,
      });
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

  async function aprovar(id: string) {
    const token = getAccessToken();
    await apiFetch(`/admin/corretores/${id}/aprovar`, { method: 'POST', token });
    setRows((r) => r.filter((c) => c.id !== id));
  }

  async function rejeitar(id: string) {
    const motivo = window.prompt('Motivo da rejeição:');
    if (!motivo) return;
    const token = getAccessToken();
    try {
      await apiFetch(`/admin/corretores/${id}/rejeitar`, {
        method: 'POST',
        token,
        body: { motivo },
      });
      setRows((r) => r.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof ApiRequestError ? err.message : 'Erro ao rejeitar.');
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
        <h1 style={{ fontSize: '1.5rem' }}>Verificação de CRECI</h1>
        <p className="muted" style={{ marginBottom: '0.75rem' }}>Corretores aguardando aprovação.</p>
        <p style={{ marginBottom: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a href="/admin/exclusividades">Ver fila de exclusividades →</a>
          <a href="/admin/equipe">Gerenciar administradores →</a>
        </p>

        {erro && <div className="banner banner-error">{erro}</div>}
        {loading ? (
          <p className="muted">Carregando...</p>
        ) : rows.length === 0 ? (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>Nenhum corretor pendente no momento.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>CRECI</th>
                <th>Cidade</th>
                <th>Cadastro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{c.creci}</td>
                  <td>{c.cidade}</td>
                  <td>{new Date(c.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-emerald" onClick={() => aprovar(c.id)}>
                        Aprovar
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
      </div>
    </div>
  );
}
