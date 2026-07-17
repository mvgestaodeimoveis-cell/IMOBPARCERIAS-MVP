'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatBRL } from '@/lib/masks';
import { getAccessToken } from '@/lib/auth';
import { TIPO_LABEL, CONVERSA_STATUS_LABEL as STATUS_LABEL } from '@/lib/labels';
import { iniciais, tempoRelativo } from '@/lib/format';

interface Conversa {
  id: string;
  status: string;
  imovel: { id: string; tipo: string; bairro: string; cidade: string; preco: number; foto: string | null };
  outro_nome: string;
  sou_captador: boolean;
  nao_lidas: number;
  ultima_mensagem: { corpo: string; criado_em: string } | null;
}

export default function ConversasPage() {
  const router = useRouter();
  const [conversas, setConversas] = useState<Conversa[] | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    apiFetch<{ data: Conversa[] }>('/parcerias/conversas', { token })
      .then((res) => setConversas(res.data))
      .catch(() => setConversas([]));
  }, [router]);

  return (
    <>
      <h1 style={{ fontSize: '1.5rem' }}>Conversas</h1>
      <p className="muted" style={{ marginBottom: '1.25rem' }}>
        Suas negociações ativas em um só lugar.
      </p>

        {conversas === null ? (
          <p className="muted">Carregando…</p>
        ) : conversas.length === 0 ? (
          <div className="card empty-state">
            <span className="empty-ico">💬</span>
            <h3 style={{ textTransform: 'uppercase', fontWeight: 800 }}>Nenhuma conversa ainda</h3>
            <p className="muted" style={{ margin: '0.35rem auto 1rem', maxWidth: '32ch' }}>
              Quando uma parceria for aceita, o chat aparece aqui.
            </p>
            <Link href="/vitrine" className="btn btn-emerald" style={{ width: 'auto' }}>
              Explorar a vitrine
            </Link>
          </div>
        ) : (
          <div className="conversa-lista">
            {conversas.map((c) => (
              <Link key={c.id} href={`/conversas/${c.id}`} className={`conversa-item${c.nao_lidas > 0 ? ' nao-lida' : ''}`}>
                <div className="conversa-avatar" aria-hidden>
                  {c.imovel.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imovel.foto} alt="" />
                  ) : (
                    iniciais(c.outro_nome)
                  )}
                </div>
                <div className="conversa-corpo">
                  <div className="conversa-linha1">
                    <strong className="conversa-nome">{c.outro_nome}</strong>
                    <span className="conversa-hora">
                      {tempoRelativo(c.ultima_mensagem?.criado_em ?? null)}
                    </span>
                  </div>
                  <p className="conversa-imovel">
                    {TIPO_LABEL[c.imovel.tipo] ?? c.imovel.tipo} · {c.imovel.bairro} · {formatBRL(c.imovel.preco)}
                  </p>
                  <p className="conversa-preview">
                    {c.ultima_mensagem
                      ? c.ultima_mensagem.corpo
                      : 'Combine a visita por aqui.'}
                  </p>
                </div>
                {c.nao_lidas > 0 ? (
                  <span className="conversa-badge" aria-label={`${c.nao_lidas} não lidas`}>
                    {c.nao_lidas > 9 ? '9+' : c.nao_lidas}
                  </span>
                ) : (
                  c.status !== 'aceita' && (
                    <span
                      className={`badge ${c.status === 'em_negociacao' ? 'badge-orange' : c.status === 'vendida' ? 'badge-emerald' : 'badge-gray'}`}
                    >
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  )
                )}
              </Link>
            ))}
          </div>
        )}
    </>
  );
}
