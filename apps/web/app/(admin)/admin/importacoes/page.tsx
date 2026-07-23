'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { getAccessToken, getRole } from '@/lib/auth';
import { tempoRelativo } from '@/lib/format';

interface ImportLog {
  id: string;
  texto: string;
  reconhecidos: string[];
  reconhecidos_count: number;
  origem: string;
  criado_em: string;
  corretor_nome: string | null;
}

interface ListResponse {
  data: ImportLog[];
  total: number;
  falhas: number;
}

export default function AdminImportacoesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ImportLog[]>([]);
  const [total, setTotal] = useState(0);
  const [falhas, setFalhas] = useState(0);
  const [soFalhas, setSoFalhas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const token = getAccessToken();
    if (!token || getRole() !== 'equipe') {
      router.replace('/admin/login');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<ListResponse>(
        `/admin/import-logs${soFalhas ? '?so_falhas=1' : ''}`,
        { token },
      );
      setRows(res.data);
      setTotal(res.total);
      setFalhas(res.falhas);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'UNAUTHENTICATED') {
        router.replace('/admin/login');
        return;
      }
      setErro('Não foi possível carregar as importações.');
    } finally {
      setLoading(false);
    }
  }, [router, soFalhas]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <>
      <h1 style={{ fontSize: '1.5rem' }}>Importações por texto</h1>
      <p className="muted" style={{ marginTop: '-0.5rem' }}>
        Histórico das colagens do WhatsApp no cadastro — {total} no total, {falhas} sem nada reconhecido.
        Use os textos que falharam para melhorar o reconhecimento automático.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={soFalhas} onChange={(e) => setSoFalhas(e.target.checked)} />
          <span>Mostrar só as que não reconheceram nada</span>
        </label>
      </div>

      {erro && <div className="banner banner-error">{erro}</div>}
      {loading ? (
        <p className="muted">Carregando…</p>
      ) : rows.length === 0 ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>Nenhuma importação registrada ainda.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {rows.map((l) => (
            <div key={l.id} className="card" style={{ padding: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={`badge badge-dot ${l.reconhecidos_count === 0 ? 'badge-red' : 'badge-emerald'}`}>
                  {l.reconhecidos_count === 0 ? 'Nada reconhecido' : `${l.reconhecidos_count} campo(s)`}
                </span>
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  {l.corretor_nome ?? 'Corretor removido'} · {tempoRelativo(l.criado_em)}
                </span>
              </div>
              {l.reconhecidos.length > 0 && (
                <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.82rem' }}>
                  Reconhecido: {l.reconhecidos.join(', ')}
                </p>
              )}
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: 'auto', marginTop: '0.6rem' }}
                onClick={() => setAberto(aberto === l.id ? null : l.id)}
              >
                {aberto === l.id ? 'Ocultar texto' : 'Ver texto colado'}
              </button>
              {aberto === l.id && (
                <pre
                  style={{
                    marginTop: '0.6rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: '0.82rem',
                    background: 'var(--gray-50, #f8fafc)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '0.7rem',
                    fontFamily: 'inherit',
                  }}
                >
                  {l.texto}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
