'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { formatBRL } from '@/lib/masks';
import { getAccessToken } from '@/lib/auth';
import { TIPO_LABEL } from '@/lib/labels';
import { iniciais, waLink } from '@/lib/format';

interface Detalhe {
  id: string;
  status: string;
  outro_nome: string;
  imovel: {
    id: string;
    tipo: string;
    bairro: string;
    cidade: string;
    preco: number;
  };
  contatos: {
    captador: { nome: string; whatsapp: string | null };
    comprador: { nome: string; whatsapp: string | null };
  } | null;
  papel: 'captador' | 'comprador';
}

interface Mensagem {
  id: string;
  corpo: string;
  criado_em: string;
  meu: boolean;
}

function mesmoDia(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function rotuloDia(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === hoje.toDateString()) return 'Hoje';
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

const DENUNCIA_CATEGORIAS: { valor: string; label: string }[] = [
  { valor: 'erro_tecnico', label: 'Falha ou erro na ferramenta' },
  { valor: 'conduta', label: 'Conduta indevida do parceiro' },
  { valor: 'fora_da_plataforma', label: 'Tentativa de negociar fora da plataforma' },
  { valor: 'outro', label: 'Outro' },
];

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  // Denúncia / relato de problema.
  const [denunciaAberta, setDenunciaAberta] = useState(false);
  const [denCategoria, setDenCategoria] = useState('erro_tecnico');
  const [denDescricao, setDenDescricao] = useState('');
  const [denEnviando, setDenEnviando] = useState(false);
  const [denOk, setDenOk] = useState(false);
  const [denErro, setDenErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    try {
      const [d, m] = await Promise.all([
        apiFetch<Detalhe>(`/parcerias/${params.id}`, { token }),
        apiFetch<{ data: Mensagem[] }>(`/parcerias/${params.id}/mensagens`, { token }),
      ]);
      setDetalhe(d);
      setMensagens(m.data);
      // Marca a conversa como lida (zera o indicador de não lidas). Best-effort.
      apiFetch(`/parcerias/${params.id}/ler`, { method: 'POST', token }).catch(() => {});
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'UNAUTHENTICATED') {
        router.replace('/login');
        return;
      }
      setErro('Não foi possível carregar a conversa.');
    }
  }, [params.id, router]);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 8000);
    return () => clearInterval(t);
  }, [carregar]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens.length]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    const token = getAccessToken();
    setEnviando(true);
    try {
      const msg = await apiFetch<Mensagem>(`/parcerias/${params.id}/mensagens`, {
        method: 'POST',
        token,
        body: { corpo: texto.trim() },
      });
      setMensagens((prev) => [...prev, msg]);
      setTexto('');
    } catch {
      setErro('Não foi possível enviar a mensagem.');
    } finally {
      setEnviando(false);
    }
  }

  async function enviarDenuncia(e: React.FormEvent) {
    e.preventDefault();
    if (denDescricao.trim().length < 5) {
      setDenErro('Descreva com um pouco mais de detalhe (mín. 5 caracteres).');
      return;
    }
    const token = getAccessToken();
    setDenEnviando(true);
    setDenErro(null);
    try {
      await apiFetch(`/parcerias/${params.id}/denuncia`, {
        method: 'POST',
        token,
        body: { categoria: denCategoria, descricao: denDescricao.trim() },
      });
      setDenOk(true);
      setDenDescricao('');
    } catch (err) {
      setDenErro(err instanceof ApiRequestError ? err.message : 'Não foi possível enviar o relato.');
    } finally {
      setDenEnviando(false);
    }
  }

  function fecharDenuncia() {
    setDenunciaAberta(false);
    setDenOk(false);
    setDenErro(null);
    setDenCategoria('erro_tecnico');
  }

  return (
    <div className="frame frame-app chat-page">
      <header className="chat-topbar">
        <button className="chat-voltar" aria-label="Voltar" onClick={() => router.push('/conversas')}>
          ←
        </button>
        <div className="chat-topbar-avatar" aria-hidden>
          {detalhe ? iniciais(detalhe.outro_nome) : '·'}
        </div>
        <div className="chat-topbar-info">
          <strong>{detalhe?.outro_nome ?? 'Conversa'}</strong>
          {detalhe && (
            <Link href={`/vitrine/${detalhe.imovel.id}`} className="chat-topbar-imovel">
              {TIPO_LABEL[detalhe.imovel.tipo] ?? detalhe.imovel.tipo} · {detalhe.imovel.bairro} · ver imóvel →
            </Link>
          )}
        </div>
        <button
          type="button"
          className="chat-denuncia-btn"
          aria-label="Reportar um problema"
          title="Reportar um problema"
          onClick={() => setDenunciaAberta(true)}
        >
          ⚑
        </button>
      </header>

      <div className="chat-scroll">
        {erro && <p className="form-error" style={{ margin: '0.5rem 0' }}>{erro}</p>}

        {detalhe && (
          <Link href={`/parcerias/${detalhe.id}`} className="chat-parceria-link">
            {formatBRL(detalhe.imovel.preco)} · ver detalhes da parceria →
          </Link>
        )}

        {detalhe?.contatos && (() => {
          const outro = detalhe.papel === 'captador' ? detalhe.contatos.comprador : detalhe.contatos.captador;
          const wa = outro.whatsapp ? waLink(outro.whatsapp) : null;
          return (
            <div className="chat-wa-banner">
              <span aria-hidden>💬</span>
              <span className="chat-wa-texto">
                Contato liberado — combine a visita com {detalhe.outro_nome} pelo WhatsApp.
              </span>
              {wa && (
                <a className="chat-wa-link" href={wa} target="_blank" rel="noopener noreferrer">
                  Abrir WhatsApp
                </a>
              )}
            </div>
          );
        })()}

        {mensagens.length === 0 ? (
          <p className="chat-vazio">
            Nenhuma mensagem ainda. Combine a visita por aqui — o contato por WhatsApp é
            liberado assim que os dois confirmarem a data da visita.
          </p>
        ) : (
          mensagens.map((m, i) => {
            const mostrarDia = i === 0 || !mesmoDia(m.criado_em, mensagens[i - 1].criado_em);
            return (
              <Fragment key={m.id}>
                {mostrarDia && <div className="chat-dia">{rotuloDia(m.criado_em)}</div>}
                <div className={`chat-msg${m.meu ? ' meu' : ''}`}>
                  {!m.meu && <span className="chat-autor">{detalhe?.outro_nome}</span>}
                  <span className="chat-bolha">{m.corpo}</span>
                  <span className="chat-hora">
                    {new Date(m.criado_em).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </Fragment>
            );
          })
        )}
        <div ref={fimRef} />
      </div>

      {detalhe ? (
        <form onSubmit={enviar} className="chat-composer chat-composer-fixo">
          <input
            className="input"
            placeholder="Escreva uma mensagem…"
            value={texto}
            maxLength={2000}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button
            className="btn btn-emerald chat-enviar"
            disabled={enviando || !texto.trim()}
            aria-label="Enviar mensagem"
          >
            ➤
          </button>
        </form>
      ) : null}

      {denunciaAberta && (
        <div className="modal-overlay" onClick={fecharDenuncia}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Reportar um problema</h2>
              <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={fecharDenuncia}>Fechar</button>
            </div>

            {denOk ? (
              <div style={{ marginTop: '1rem' }}>
                <div className="banner banner-success">
                  Relato enviado para a equipe. Vamos analisar e, se necessário, entrar em contato. Obrigado!
                </div>
                <button className="btn btn-emerald" style={{ marginTop: '0.85rem' }} onClick={fecharDenuncia}>Concluir</button>
              </div>
            ) : (
              <form onSubmit={enviarDenuncia} style={{ marginTop: '1rem' }}>
                <p className="muted" style={{ margin: '0 0 0.85rem', fontSize: '0.86rem' }}>
                  Use este canal para relatar falhas, erros ou uso indevido da ferramenta. A equipe recebe por e-mail e acompanha o caso.
                </p>
                <label className="detail-label" htmlFor="den-cat">Tipo do problema</label>
                <select
                  id="den-cat"
                  className="input"
                  value={denCategoria}
                  onChange={(e) => setDenCategoria(e.target.value)}
                  style={{ marginBottom: '0.75rem' }}
                >
                  {DENUNCIA_CATEGORIAS.map((c) => (
                    <option key={c.valor} value={c.valor}>{c.label}</option>
                  ))}
                </select>
                <label className="detail-label" htmlFor="den-desc">O que aconteceu?</label>
                <textarea
                  id="den-desc"
                  className="input"
                  placeholder="Descreva o problema com o máximo de detalhes."
                  maxLength={2000}
                  value={denDescricao}
                  onChange={(e) => setDenDescricao(e.target.value)}
                  style={{ minHeight: 110 }}
                />
                {denErro && <div className="banner banner-error" style={{ marginTop: '0.6rem' }}>{denErro}</div>}
                <button className="btn btn-emerald" style={{ marginTop: '0.85rem' }} disabled={denEnviando}>
                  {denEnviando ? 'Enviando…' : 'Enviar relato'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
