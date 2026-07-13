'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { formatBRL } from '@/lib/masks';
import { getAccessToken } from '@/lib/auth';
import { Brandmark } from '@/components/Brandmark';

interface Endereco {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  unidade: string | null;
  andar: string | null;
  bloco: string | null;
}

interface Detalhe {
  id: string;
  status: string;
  papel: 'captador' | 'comprador';
  cliente_nome: string;
  imovel: {
    tipo: string;
    bairro: string;
    cidade: string;
    preco: number;
    endereco: Endereco | null;
  };
  confirmacao: {
    visita_em: string | null;
    cpf_preenchido: boolean;
    cpf_cliente: string | null;
    confirmada_em: string | null;
    janela_dias: number;
    janela_ativada_em: string | null;
  };
  contatos: {
    captador: { nome: string; whatsapp: string | null };
    comprador: { nome: string; whatsapp: string | null };
  } | null;
  venda: {
    valor: number;
    comissao: number;
    taxa_plataforma: number;
    declarada_em: string;
    pagamento_status: string;
    pagamento_vencimento: string | null;
    pagamento_confirmado_em: string | null;
  } | null;
  avaliacao: { ja_avaliei: boolean; total: number };
}

interface Mensagem {
  id: string;
  corpo: string;
  criado_em: string;
  meu: boolean;
}

const TIPO_LABEL: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  terreno: 'Terreno',
  comercial: 'Comercial',
};

function maskCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function waLink(whatsapp: string | null): string | null {
  if (!whatsapp) return null;
  return `https://wa.me/${whatsapp.replace(/\D/g, '')}`;
}

export default function ParceriaDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [dataVisita, setDataVisita] = useState('');
  const [cpf, setCpf] = useState('');
  const [acaoErro, setAcaoErro] = useState<string | null>(null);
  const [valorVenda, setValorVenda] = useState('');
  const [notaAval, setNotaAval] = useState(0);
  const [comentarioAval, setComentarioAval] = useState('');
  const fimRef = useRef<HTMLDivElement>(null);

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
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'UNAUTHENTICATED') {
        router.replace('/login');
        return;
      }
      setErro('Não foi possível carregar a parceria.');
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
      setMensagens((m) => [...m, msg]);
      setTexto('');
    } catch (err) {
      setAcaoErro(err instanceof ApiRequestError ? err.message : 'Erro ao enviar mensagem.');
    } finally {
      setEnviando(false);
    }
  }

  async function registrarVisita() {
    if (!dataVisita) return;
    setAcaoErro(null);
    const token = getAccessToken();
    try {
      await apiFetch(`/parcerias/${params.id}/visita`, {
        method: 'POST',
        token,
        body: { visita_em: dataVisita },
      });
      carregar();
    } catch (err) {
      setAcaoErro(err instanceof ApiRequestError ? err.message : 'Erro ao registrar a visita.');
    }
  }

  async function inserirCpf() {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) {
      setAcaoErro('Informe um CPF válido.');
      return;
    }
    setAcaoErro(null);
    const token = getAccessToken();
    try {
      await apiFetch(`/parcerias/${params.id}/cpf`, {
        method: 'POST',
        token,
        body: { cpf: digits },
      });
      setCpf('');
      carregar();
    } catch (err) {
      setAcaoErro(err instanceof ApiRequestError ? err.message : 'Erro ao inserir o CPF.');
    }
  }

  async function declararVenda() {
    const valor = Number(valorVenda.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, ''));
    if (!valor || valor <= 0) {
      setAcaoErro('Informe o valor da venda.');
      return;
    }
    setAcaoErro(null);
    const token = getAccessToken();
    try {
      await apiFetch(`/parcerias/${params.id}/venda`, { method: 'POST', token, body: { valor } });
      setValorVenda('');
      carregar();
    } catch (err) {
      setAcaoErro(err instanceof ApiRequestError ? err.message : 'Erro ao declarar a venda.');
    }
  }

  async function encerrar() {
    if (!window.confirm('Encerrar sem venda? O imóvel volta a ficar disponível na vitrine.')) return;
    setAcaoErro(null);
    const token = getAccessToken();
    try {
      await apiFetch(`/parcerias/${params.id}/encerrar`, { method: 'POST', token });
      carregar();
    } catch (err) {
      setAcaoErro(err instanceof ApiRequestError ? err.message : 'Erro ao encerrar.');
    }
  }

  async function avaliar() {
    if (notaAval < 1) {
      setAcaoErro('Escolha uma nota de 1 a 5.');
      return;
    }
    setAcaoErro(null);
    const token = getAccessToken();
    try {
      await apiFetch(`/parcerias/${params.id}/avaliacao`, {
        method: 'POST',
        token,
        body: { nota: notaAval, comentario: comentarioAval.trim() || undefined },
      });
      setComentarioAval('');
      carregar();
    } catch (err) {
      setAcaoErro(err instanceof ApiRequestError ? err.message : 'Erro ao enviar avaliação.');
    }
  }

  return (
    <div className="frame frame-app">
      <header className="topbar">
        <Brandmark />
        <Link href="/parcerias" className="auth-back">
          <span aria-hidden>←</span> Parcerias
        </Link>
      </header>

      <div className="screen">
        {erro && <div className="banner banner-error">{erro}</div>}
        {!detalhe ? (
          !erro && <p className="muted">Carregando…</p>
        ) : (
          <>
            <h1 style={{ fontSize: '1.3rem' }}>
              {TIPO_LABEL[detalhe.imovel.tipo] ?? detalhe.imovel.tipo} · {detalhe.imovel.bairro}
            </h1>
            <p className="muted" style={{ marginTop: '0.2rem' }}>
              {formatBRL(detalhe.imovel.preco)} · Cliente: {detalhe.cliente_nome} ·{' '}
              <strong>{detalhe.status.replace('_', ' ')}</strong>
            </p>

            {/* Nível 2 — endereço completo (após match aceito) */}
            {detalhe.imovel.endereco && (
              <div className="card" style={{ marginTop: '0.85rem' }}>
                <h3 className="detail-label">Endereço (Nível 2)</h3>
                <p style={{ margin: 0 }}>
                  {detalhe.imovel.endereco.logradouro}, {detalhe.imovel.endereco.numero}
                  {detalhe.imovel.endereco.complemento ? ` — ${detalhe.imovel.endereco.complemento}` : ''}
                  {detalhe.imovel.endereco.unidade ? ` · Unid. ${detalhe.imovel.endereco.unidade}` : ''}
                  {detalhe.imovel.endereco.andar ? ` · ${detalhe.imovel.endereco.andar}º andar` : ''}
                  {detalhe.imovel.endereco.bloco ? ` · Bloco ${detalhe.imovel.endereco.bloco}` : ''}
                  <br />
                  {detalhe.imovel.bairro}, {detalhe.imovel.cidade} · CEP {detalhe.imovel.endereco.cep}
                </p>
              </div>
            )}

            {/* Confirmação bilateral */}
            <div className="card" style={{ marginTop: '0.85rem' }}>
              <h3 className="detail-label">Confirmação bilateral da visita</h3>
              {acaoErro && <div className="banner banner-error">{acaoErro}</div>}

              <p className="muted" style={{ fontSize: '0.86rem' }}>
                {detalhe.confirmacao.visita_em ? '✅' : '⬜'} Data da visita (captador)
                {detalhe.confirmacao.visita_em
                  ? `: ${new Date(detalhe.confirmacao.visita_em).toLocaleDateString('pt-BR')}`
                  : ' — pendente'}
                <br />
                {detalhe.confirmacao.cpf_preenchido ? '✅' : '⬜'} CPF do cliente (comprador)
                {detalhe.confirmacao.cpf_preenchido ? ': inserido' : ' — pendente'}
              </p>

              {detalhe.status === 'aceita' && detalhe.papel === 'captador' && !detalhe.confirmacao.visita_em && (
                <div className="field">
                  <label htmlFor="visita">Registrar data da visita</label>
                  <input
                    id="visita"
                    type="date"
                    className="input"
                    value={dataVisita}
                    onChange={(e) => setDataVisita(e.target.value)}
                  />
                  <button className="btn btn-emerald" style={{ marginTop: '0.5rem' }} onClick={registrarVisita} disabled={!dataVisita}>
                    Registrar visita
                  </button>
                </div>
              )}

              {detalhe.status === 'aceita' && detalhe.papel === 'comprador' && !detalhe.confirmacao.cpf_preenchido && (
                <div className="field">
                  <label htmlFor="cpf">CPF do cliente</label>
                  <input
                    id="cpf"
                    inputMode="numeric"
                    className="input"
                    placeholder="000.000.000-00"
                    value={cpf}
                    maxLength={14}
                    onChange={(e) => setCpf(maskCpf(e.target.value))}
                  />
                  <button className="btn btn-emerald" style={{ marginTop: '0.5rem' }} onClick={inserirCpf} disabled={cpf.replace(/\D/g, '').length !== 11}>
                    Inserir CPF
                  </button>
                </div>
              )}

              {detalhe.status === 'em_negociacao' && (
                <div className="banner banner-success">
                  Confirmação concluída! Janela de {detalhe.confirmacao.janela_dias} dias ativada. Contato liberado.
                </div>
              )}
            </div>

            {/* Fase 8/9 — fechamento */}
            {['em_negociacao', 'vendida', 'encerrada'].includes(detalhe.status) && (
              <div className="card" style={{ marginTop: '0.85rem' }}>
                <h3 className="detail-label">Fechamento</h3>

                {detalhe.status === 'em_negociacao' && (
                  <>
                    {detalhe.papel === 'captador' ? (
                      <div className="field">
                        <label htmlFor="valor">Declarar venda — valor final (R$)</label>
                        <input
                          id="valor"
                          inputMode="numeric"
                          className="input"
                          placeholder="Ex.: 500000"
                          value={valorVenda}
                          onChange={(e) => setValorVenda(e.target.value)}
                        />
                        <button className="btn btn-emerald" style={{ marginTop: '0.5rem' }} onClick={declararVenda}>
                          Declarar venda
                        </button>
                      </div>
                    ) : (
                      <p className="muted" style={{ fontSize: '0.86rem' }}>
                        A declaração da venda é feita pelo corretor captador.
                      </p>
                    )}
                    <button className="btn btn-ghost" style={{ marginTop: '0.5rem' }} onClick={encerrar}>
                      Encerrar sem venda
                    </button>
                  </>
                )}

                {detalhe.venda && (
                  <>
                    <p style={{ margin: '0 0 0.5rem' }}>
                      <strong>Venda:</strong> {formatBRL(detalhe.venda.valor)}<br />
                      <strong>Comissão (5%):</strong> {formatBRL(detalhe.venda.comissao)}<br />
                      <strong>Taxa da plataforma (10% da comissão):</strong> {formatBRL(detalhe.venda.taxa_plataforma)}
                    </p>
                    {detalhe.venda.pagamento_status === 'pendente' && (
                      <div className="banner banner-warning">
                        Pagamento da taxa via PIX pendente
                        {detalhe.venda.pagamento_vencimento
                          ? ` — vence em ${new Date(detalhe.venda.pagamento_vencimento).toLocaleDateString('pt-BR')}`
                          : ''}
                        . A equipe confirma o recebimento.
                      </div>
                    )}
                    {detalhe.venda.pagamento_status === 'confirmado' && (
                      <div className="banner banner-success">Pagamento confirmado pela equipe.</div>
                    )}
                  </>
                )}

                {detalhe.status === 'encerrada' && !detalhe.venda && (
                  <p className="muted" style={{ margin: 0, fontSize: '0.86rem' }}>
                    Negociação encerrada sem venda. O imóvel voltou para a vitrine.
                  </p>
                )}

                {/* Avaliação mútua — após pagamento confirmado */}
                {detalhe.venda?.pagamento_status === 'confirmado' && (
                  detalhe.avaliacao.ja_avaliei ? (
                    <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.86rem' }}>
                      ⭐ Você já avaliou esta parceria.
                    </p>
                  ) : (
                    <div style={{ marginTop: '0.75rem' }}>
                      <label className="detail-label">Avalie o outro corretor</label>
                      <div style={{ display: 'flex', gap: '0.25rem', margin: '0.35rem 0' }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setNotaAval(n)}
                            aria-label={`${n} estrela(s)`}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: n <= notaAval ? '#EC6F1C' : '#cbd5e1' }}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="input"
                        placeholder="Comentário (opcional)"
                        maxLength={1000}
                        value={comentarioAval}
                        onChange={(e) => setComentarioAval(e.target.value)}
                        style={{ minHeight: 70 }}
                      />
                      <button className="btn btn-emerald" style={{ marginTop: '0.5rem' }} onClick={avaliar} disabled={notaAval < 1}>
                        Enviar avaliação
                      </button>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Nível 3 — contatos revelados */}
            {detalhe.contatos && (
              <div className="card" style={{ marginTop: '0.85rem' }}>
                <h3 className="detail-label">Contatos liberados (Nível 3)</h3>
                <p style={{ margin: 0 }}>
                  <strong>Captador:</strong> {detalhe.contatos.captador.nome}
                  {detalhe.contatos.captador.whatsapp && (
                    <> · <a href={waLink(detalhe.contatos.captador.whatsapp) ?? '#'} target="_blank" rel="noopener noreferrer">{detalhe.contatos.captador.whatsapp}</a></>
                  )}
                  <br />
                  <strong>Comprador:</strong> {detalhe.contatos.comprador.nome}
                  {detalhe.contatos.comprador.whatsapp && (
                    <> · <a href={waLink(detalhe.contatos.comprador.whatsapp) ?? '#'} target="_blank" rel="noopener noreferrer">{detalhe.contatos.comprador.whatsapp}</a></>
                  )}
                  {detalhe.papel === 'captador' && detalhe.confirmacao.cpf_cliente && (
                    <>
                      <br />
                      <strong>CPF do cliente:</strong> {maskCpf(detalhe.confirmacao.cpf_cliente)}
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Chat interno */}
            <div className="card" style={{ marginTop: '0.85rem' }}>
              <h3 className="detail-label">Chat interno</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 320, overflowY: 'auto', padding: '0.25rem 0' }}>
                {mensagens.length === 0 ? (
                  <p className="muted" style={{ margin: 0, fontSize: '0.86rem' }}>
                    Nenhuma mensagem ainda. Combine a visita por aqui — o contato direto é liberado após a confirmação bilateral.
                  </p>
                ) : (
                  mensagens.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: m.meu ? 'flex-end' : 'flex-start',
                        background: m.meu ? 'var(--emerald)' : 'var(--bg)',
                        color: m.meu ? '#fff' : 'inherit',
                        borderRadius: 12,
                        padding: '0.45rem 0.7rem',
                        maxWidth: '80%',
                        fontSize: '0.9rem',
                      }}
                    >
                      {m.corpo}
                    </div>
                  ))
                )}
                <div ref={fimRef} />
              </div>

              {detalhe.status === 'aceita' ? (
                <form onSubmit={enviar} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input
                    className="input"
                    placeholder="Escreva uma mensagem…"
                    value={texto}
                    maxLength={2000}
                    onChange={(e) => setTexto(e.target.value)}
                  />
                  <button className="btn btn-emerald" style={{ width: 'auto', minHeight: 'auto', padding: '0 1rem' }} disabled={enviando || !texto.trim()}>
                    Enviar
                  </button>
                </form>
              ) : (
                <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.82rem' }}>
                  O chat é encerrado após a confirmação bilateral. O histórico fica registrado.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
