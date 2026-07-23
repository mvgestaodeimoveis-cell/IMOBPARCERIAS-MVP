'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { getAccessToken, getRole } from '@/lib/auth';
import { tempoRelativo, waLink } from '@/lib/format';
import { TIPO_LABEL } from '@/lib/labels';

interface Contato {
  nome: string;
  email: string;
  whatsapp: string | null;
}

interface Denuncia {
  id: string;
  parceria_id: string;
  categoria: string;
  descricao: string;
  status: string;
  resolucao_nota: string | null;
  resolvido_em: string | null;
  criado_em: string;
  autor_nome: string;
  imovel: { id: string; tipo: string; bairro: string; cidade: string };
  captador: Contato;
  comprador: Contato;
}

interface ListResponse {
  data: Denuncia[];
  pendentes: number;
}

const CATEGORIA_LABEL: Record<string, string> = {
  erro_tecnico: 'Falha ou erro técnico',
  conduta: 'Conduta indevida',
  fora_da_plataforma: 'Negociação fora da plataforma',
  outro: 'Outro',
};

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  pendente: { cls: 'badge-amber', label: 'Pendente' },
  em_analise: { cls: 'badge-orange', label: 'Em análise' },
  resolvida: { cls: 'badge-emerald', label: 'Resolvida' },
};

const FILTROS = ['', 'pendente', 'resolvida'];

export default function AdminDenunciasPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Denuncia[]>([]);
  const [pendentes, setPendentes] = useState(0);
  const [status, setStatus] = useState('pendente');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aberta, setAberta] = useState<Denuncia | null>(null);
  const [nota, setNota] = useState('');
  const [salvando, setSalvando] = useState(false);

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
      const res = await apiFetch<ListResponse>(`/admin/denuncias?${params.toString()}`, { token });
      setRows(res.data);
      setPendentes(res.pendentes);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'UNAUTHENTICATED') {
        router.replace('/admin/login');
        return;
      }
      setErro('Não foi possível carregar as denúncias.');
    } finally {
      setLoading(false);
    }
  }, [router, status]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function resolver() {
    if (!aberta || nota.trim().length < 3) return;
    const token = getAccessToken();
    setSalvando(true);
    try {
      await apiFetch(`/admin/denuncias/${aberta.id}/resolver`, {
        method: 'POST',
        token,
        body: { nota: nota.trim() },
      });
      setAberta(null);
      setNota('');
      carregar();
    } catch (err) {
      alert(err instanceof ApiRequestError ? err.message : 'Erro ao registrar a resolução.');
    } finally {
      setSalvando(false);
    }
  }

  function abrir(d: Denuncia) {
    setAberta(d);
    setNota(d.resolucao_nota ?? '');
  }

  return (
    <>
      <h1 style={{ fontSize: '1.5rem' }}>Denúncias {pendentes > 0 && <span className="badge badge-amber">{pendentes} pendente(s)</span>}</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select className="input" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {FILTROS.map((s) => (
            <option key={s} value={s}>{s ? (STATUS_BADGE[s]?.label ?? s) : 'Todas'}</option>
          ))}
        </select>
      </div>

      {erro && <div className="banner banner-error">{erro}</div>}
      {loading ? (
        <p className="muted">Carregando…</p>
      ) : rows.length === 0 ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>Nenhuma denúncia neste filtro.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {rows.map((d) => (
            <div key={d.id} className="card" style={{ padding: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.95rem' }}>{CATEGORIA_LABEL[d.categoria] ?? d.categoria}</strong>
                <span className={`badge badge-dot ${STATUS_BADGE[d.status]?.cls ?? 'badge-gray'}`}>
                  {STATUS_BADGE[d.status]?.label ?? d.status}
                </span>
              </div>
              <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
                Por <strong>{d.autor_nome}</strong> · {tempoRelativo(d.criado_em)} ·{' '}
                {TIPO_LABEL[d.imovel.tipo] ?? d.imovel.tipo} em {d.imovel.bairro}, {d.imovel.cidade}
              </p>
              <p style={{ margin: '0.55rem 0 0', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{d.descricao}</p>
              <button className="btn btn-ghost btn-sm" style={{ width: 'auto', marginTop: '0.7rem' }} onClick={() => abrir(d)}>
                {d.status === 'resolvida' ? 'Ver detalhes' : 'Atender'}
              </button>
            </div>
          ))}
        </div>
      )}

      {aberta && (
        <div className="modal-overlay" onClick={() => setAberta(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.15rem', margin: 0 }}>{CATEGORIA_LABEL[aberta.categoria] ?? aberta.categoria}</h2>
              <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={() => setAberta(null)}>Fechar</button>
            </div>

            <p className="muted" style={{ margin: '0.4rem 0 0', fontSize: '0.82rem' }}>
              Aberta por <strong>{aberta.autor_nome}</strong> · {new Date(aberta.criado_em).toLocaleString('pt-BR')}
            </p>

            <div className="card" style={{ marginTop: '0.85rem', padding: '0.85rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{aberta.descricao}</p>
            </div>

            <h3 className="detail-label" style={{ marginTop: '1rem' }}>Contatos dos corretores</h3>
            <div className="info-stack">
              {([aberta.captador, aberta.comprador] as Contato[]).map((c, i) => (
                <div key={i} className="info-item">
                  <span className="info-dt">{i === 0 ? 'Captador' : 'Comprador'}</span>
                  <span className="info-dd">{c.nome}</span>
                  <a className="info-wa" href={`mailto:${c.email}`}>{c.email}</a>
                  {c.whatsapp && (
                    <a className="info-wa" href={waLink(c.whatsapp) ?? '#'} target="_blank" rel="noopener noreferrer">
                      WhatsApp: {c.whatsapp}
                    </a>
                  )}
                </div>
              ))}
            </div>

            <p style={{ margin: '0.85rem 0 0' }}>
              <a href={`/admin/conversas/${aberta.parceria_id}`} className="btn btn-ghost btn-sm" style={{ width: 'auto' }}>
                Ver a conversa
              </a>
            </p>

            {aberta.status === 'resolvida' ? (
              <div className="banner banner-success" style={{ marginTop: '1rem' }}>
                Resolvida em {aberta.resolvido_em ? new Date(aberta.resolvido_em).toLocaleString('pt-BR') : '—'}.
                {aberta.resolucao_nota && <><br /><strong>Nota:</strong> {aberta.resolucao_nota}</>}
              </div>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                <label className="detail-label" htmlFor="nota">Como o caso foi tratado?</label>
                <textarea
                  id="nota"
                  className="input"
                  placeholder="Ex.: entrei em contato com os dois corretores por WhatsApp; ajustado / advertência aplicada."
                  maxLength={2000}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  style={{ minHeight: 100 }}
                />
                <button className="btn btn-emerald" style={{ marginTop: '0.75rem' }} onClick={resolver} disabled={salvando || nota.trim().length < 3}>
                  {salvando ? 'Salvando…' : 'Marcar como resolvida'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
