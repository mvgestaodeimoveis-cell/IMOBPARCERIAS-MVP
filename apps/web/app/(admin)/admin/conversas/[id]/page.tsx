'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { getAccessToken, getRole } from '@/lib/auth';
import { TIPO_LABEL, PARCERIA_STATUS_LABEL as STATUS_LABEL } from '@/lib/labels';

interface Mensagem {
  id: string;
  autor_id: string;
  autor_nome: string;
  corpo: string;
  criado_em: string;
  alerta: boolean;
}

interface Feedback {
  autor_id: string;
  autor_nome: string;
  resultado: string;
  observacao: string | null;
  criado_em: string;
}

interface Conversa {
  parceria: {
    id: string;
    status: string;
    imovel_id: string;
    imovel_tipo: string;
    imovel_bairro: string;
    imovel_cidade: string;
    captador_id: string;
    captador_nome: string;
    comprador_id: string;
    comprador_nome: string;
  };
  mensagens: Mensagem[];
  feedbacks: Feedback[];
}

const FEEDBACK_LABEL: Record<string, string> = {
  proposta: 'Houve proposta',
  interesse_sem_proposta: 'Interesse, sem proposta',
  sem_interesse: 'Sem interesse / não gostou',
  revisitar: 'Deseja revisitar (sem data)',
  outros: 'Outros motivos',
};

export default function AdminConversaDetalhePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [conversa, setConversa] = useState<Conversa | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const token = getAccessToken();
    if (!token || getRole() !== 'equipe') {
      router.replace('/admin/login');
      return;
    }
    try {
      setConversa(await apiFetch<Conversa>(`/admin/conversas/${params.id}`, { token }));
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'UNAUTHENTICATED') {
        router.replace('/admin/login');
        return;
      }
      setErro('Não foi possível carregar a conversa.');
    }
  }, [router, params.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const p = conversa?.parceria;

  return (
    <>
      <Link href="/admin/conversas" className="btn btn-ghost" style={{ width: 'auto', minHeight: 'auto', padding: '0.35rem 0.7rem', marginBottom: '0.75rem' }}>
        ← Conversas
      </Link>

      {erro && <div className="banner banner-error">{erro}</div>}

      {!conversa || !p ? (
        !erro && <p className="muted">Carregando…</p>
      ) : (
        <>
          <h1 style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>
            {TIPO_LABEL[p.imovel_tipo] ?? p.imovel_tipo} · {p.imovel_bairro}, {p.imovel_cidade}
          </h1>
          <p className="muted" style={{ marginTop: 0 }}>
            <strong>{p.captador_nome}</strong> (captador) ↔ <strong>{p.comprador_nome}</strong> (comprador)
            <span className="badge badge-gray" style={{ marginLeft: '0.5rem' }}>{STATUS_LABEL[p.status] ?? p.status}</span>
          </p>

          {conversa.mensagens.some((m) => m.alerta) && (
            <div className="banner banner-error" style={{ marginTop: '0.5rem' }}>
              ⚠️ Esta conversa tem mensagens que podem indicar tentativa de contato ou negociação por
              fora da plataforma (destacadas abaixo).
            </div>
          )}

          {conversa.feedbacks.length > 0 && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <h3 className="detail-label">Feedback da visita</h3>
              <div className="info-stack">
                {conversa.feedbacks.map((f) => (
                  <div key={`${f.autor_id}-${f.criado_em}`} className="info-item">
                    <span className="info-dt">
                      {f.autor_nome} · {new Date(f.criado_em).toLocaleString('pt-BR')}
                    </span>
                    <span className="info-dd">
                      <strong>{FEEDBACK_LABEL[f.resultado] ?? f.resultado}</strong>
                      {f.observacao ? ` — ${f.observacao}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="admin-chat" style={{ marginTop: '1rem' }}>
            {conversa.mensagens.length === 0 ? (
              <p className="muted">Sem mensagens.</p>
            ) : (
              conversa.mensagens.map((m) => {
                const doCaptador = m.autor_id === p.captador_id;
                return (
                  <div key={m.id} className={`admin-chat-msg${doCaptador ? ' captador' : ' comprador'}${m.alerta ? ' alerta' : ''}`}>
                    <div className="admin-chat-head">
                      <strong>{m.autor_nome}</strong>
                      <span className="muted">{new Date(m.criado_em).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="admin-chat-corpo">{m.corpo}</p>
                    {m.alerta && <span className="admin-chat-flag">⚠️ Possível contato externo</span>}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </>
  );
}
