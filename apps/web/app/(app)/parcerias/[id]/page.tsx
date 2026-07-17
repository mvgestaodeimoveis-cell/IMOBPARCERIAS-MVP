'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { formatBRL, maskCpf } from '@/lib/masks';
import { waLink } from '@/lib/format';
import { getAccessToken } from '@/lib/auth';
import { TIPO_LABEL, PARCERIA_STATUS_LABEL as STATUS_LABEL } from '@/lib/labels';
import { AppHeader } from '@/components/AppHeader';

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
  outro_nome: string;
  imovel: {
    id: string;
    tipo: string;
    bairro: string;
    cidade: string;
    preco: number;
    endereco: Endereco | null;
  };
  confirmacao: {
    visita_em: string | null;
    visita_proposta_por_mim: boolean;
    visita_confirmada_em: string | null;
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

function statusBadge(status: string): string {
  if (status === 'em_negociacao') return 'badge-orange';
  if (status === 'encerrada') return 'badge-gray';
  return 'badge-emerald';
}

const PASSOS = ['Aceita', 'Visita', 'Negociação', 'Venda'];

/** Data + hora da visita (exibe o horário como foi combinado, sem deslocar por fuso). */
function formatVisita(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

/** Índice do passo atual no fluxo (para o stepper). */
function passoAtual(status: string): number {
  if (status === 'vendida') return 4;
  if (status === 'em_negociacao') return 2;
  if (status === 'aceita') return 1;
  return 0;
}

export default function ParceriaDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [dataVisita, setDataVisita] = useState('');
  const [cpf, setCpf] = useState('');
  const [acaoErro, setAcaoErro] = useState<string | null>(null);
  const [valorVenda, setValorVenda] = useState('');
  const [notaAval, setNotaAval] = useState(0);
  const [comentarioAval, setComentarioAval] = useState('');

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

  async function proporVisita() {
    if (!dataVisita) return;
    setAcaoErro(null);
    const token = getAccessToken();
    try {
      await apiFetch(`/parcerias/${params.id}/visita/propor`, {
        method: 'POST',
        token,
        body: { visita_em: dataVisita },
      });
      setDataVisita('');
      carregar();
    } catch (err) {
      setAcaoErro(err instanceof ApiRequestError ? err.message : 'Erro ao propor a visita.');
    }
  }

  async function confirmarVisita() {
    setAcaoErro(null);
    const token = getAccessToken();
    try {
      await apiFetch(`/parcerias/${params.id}/visita/confirmar`, { method: 'POST', token });
      carregar();
    } catch (err) {
      setAcaoErro(err instanceof ApiRequestError ? err.message : 'Erro ao confirmar a visita.');
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
      <AppHeader back={{ href: '/parcerias', label: 'Parcerias' }} />

      <div className="screen">
        {erro && <div className="banner banner-error">{erro}</div>}
        {!detalhe ? (
          !erro && <p className="muted">Carregando…</p>
        ) : (
          <>
            <div className="parceria-head">
              <div className="parceria-head-main">
                <h1 style={{ fontSize: '1.3rem', margin: 0 }}>
                  {TIPO_LABEL[detalhe.imovel.tipo] ?? detalhe.imovel.tipo} · {detalhe.imovel.bairro}
                </h1>
              </div>
              <span className={`badge ${statusBadge(detalhe.status)}`}>
                {STATUS_LABEL[detalhe.status] ?? detalhe.status.replace('_', ' ')}
              </span>
            </div>

            {['aceita', 'em_negociacao', 'vendida'].includes(detalhe.status) && (
              <ol className="parceria-steps">
                {PASSOS.map((label, i) => {
                  const cur = passoAtual(detalhe.status);
                  return (
                    <li key={label} className={i < cur ? 'done' : i === cur ? 'active' : ''}>
                      <span className="parceria-step-dot">{i < cur ? '✓' : i + 1}</span>
                      <span>{label}</span>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="card" style={{ marginTop: '0.85rem' }}>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-dt">Preço</span>
                  <span className="info-dd destaque">{formatBRL(detalhe.imovel.preco)}</span>
                </div>
                <div className="info-item">
                  <span className="info-dt">Cliente</span>
                  <span className="info-dd">{detalhe.cliente_nome}</span>
                </div>
              </div>
            </div>

            {/* Nível 2 — endereço completo (após match aceito) */}
            {detalhe.imovel.endereco && (
              <div className="card" style={{ marginTop: '0.85rem' }}>
                <h3 className="detail-label">Endereço do imóvel</h3>
                <div className="info-stack">
                  <div className="info-item">
                    <span className="info-dt">Logradouro</span>
                    <span className="info-dd">
                      {detalhe.imovel.endereco.logradouro}, {detalhe.imovel.endereco.numero}
                    </span>
                  </div>
                  {(detalhe.imovel.endereco.complemento ||
                    detalhe.imovel.endereco.unidade ||
                    detalhe.imovel.endereco.andar ||
                    detalhe.imovel.endereco.bloco) && (
                    <div className="info-item">
                      <span className="info-dt">Complemento</span>
                      <span className="info-dd">
                        {[
                          detalhe.imovel.endereco.complemento,
                          detalhe.imovel.endereco.unidade ? `Unid. ${detalhe.imovel.endereco.unidade}` : null,
                          detalhe.imovel.endereco.andar ? `${detalhe.imovel.endereco.andar}º andar` : null,
                          detalhe.imovel.endereco.bloco ? `Bloco ${detalhe.imovel.endereco.bloco}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="info-dt">Bairro / Cidade</span>
                    <span className="info-dd">
                      {detalhe.imovel.bairro}, {detalhe.imovel.cidade}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-dt">CEP</span>
                    <span className="info-dd">{detalhe.imovel.endereco.cep}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmação bilateral */}
            <div className="card" style={{ marginTop: '0.85rem' }}>
              <h3 className="detail-label">Confirmação da visita</h3>
              <p className="muted" style={{ margin: '0 0 0.9rem', fontSize: '0.82rem' }}>
                Os dois lados confirmam para liberar os contatos.
              </p>
              {acaoErro && <div className="banner banner-error">{acaoErro}</div>}

              <div className="confirm-list">
                <div className={`confirm-item${detalhe.confirmacao.visita_confirmada_em ? ' ok' : ''}`}>
                  <span className="confirm-ico" aria-hidden>{detalhe.confirmacao.visita_confirmada_em ? '✓' : '1'}</span>
                  <div className="confirm-body">
                    <span className="confirm-titulo">Visita (data e hora)</span>
                    <span className="confirm-sub">
                      {detalhe.confirmacao.visita_em ? formatVisita(detalhe.confirmacao.visita_em) : 'A combinar'}
                    </span>
                  </div>
                  <span className="confirm-status">
                    {detalhe.confirmacao.visita_confirmada_em
                      ? 'Confirmada'
                      : detalhe.confirmacao.visita_em
                        ? 'Aguardando OK'
                        : 'Pendente'}
                  </span>
                </div>
                <div className={`confirm-item${detalhe.confirmacao.cpf_preenchido ? ' ok' : ''}`}>
                  <span className="confirm-ico" aria-hidden>{detalhe.confirmacao.cpf_preenchido ? '✓' : '2'}</span>
                  <div className="confirm-body">
                    <span className="confirm-titulo">CPF do cliente</span>
                    <span className="confirm-sub">Comprador</span>
                  </div>
                  <span className="confirm-status">{detalhe.confirmacao.cpf_preenchido ? 'Inserido' : 'Pendente'}</span>
                </div>
              </div>

              {/* Visita: qualquer um propõe data+hora; o OUTRO confirma */}
              {detalhe.status === 'aceita' && !detalhe.confirmacao.visita_confirmada_em && (
                <div className="confirm-acao">
                  {detalhe.confirmacao.visita_em && (
                    <p className="muted" style={{ margin: '0 0 0.6rem', fontSize: '0.86rem' }}>
                      {detalhe.confirmacao.visita_proposta_por_mim
                        ? `Você propôs ${formatVisita(detalhe.confirmacao.visita_em)}. Aguardando ${detalhe.outro_nome} confirmar.`
                        : `${detalhe.outro_nome} propôs ${formatVisita(detalhe.confirmacao.visita_em)}. Confirme se o cliente aceitou.`}
                    </p>
                  )}
                  {detalhe.confirmacao.visita_em && !detalhe.confirmacao.visita_proposta_por_mim && (
                    <button className="btn btn-emerald btn-sm" style={{ marginBottom: '0.7rem' }} onClick={confirmarVisita}>
                      Confirmar esta data/hora
                    </button>
                  )}
                  <label htmlFor="visita">
                    {detalhe.confirmacao.visita_em ? 'Propor outra data e hora' : 'Propor data e hora da visita'}
                  </label>
                  <div className="confirm-acao-row">
                    <input
                      id="visita"
                      type="datetime-local"
                      className="input"
                      value={dataVisita}
                      onChange={(e) => setDataVisita(e.target.value)}
                    />
                    <button className="btn btn-ghost btn-sm" onClick={proporVisita} disabled={!dataVisita}>
                      {detalhe.confirmacao.visita_em ? 'Repropor' : 'Propor'}
                    </button>
                  </div>
                </div>
              )}

              {detalhe.status === 'aceita' && detalhe.confirmacao.visita_confirmada_em && (
                <p className="muted" style={{ margin: '0.6rem 0 0', fontSize: '0.86rem' }}>
                  ✓ Visita confirmada para {formatVisita(detalhe.confirmacao.visita_em)}.
                  {!detalhe.confirmacao.cpf_preenchido && ' Falta o CPF do cliente para concluir.'}
                </p>
              )}

              {detalhe.status === 'aceita' && detalhe.papel === 'comprador' && !detalhe.confirmacao.cpf_preenchido && (
                <div className="confirm-acao">
                  <label htmlFor="cpf">Informe o CPF do cliente</label>
                  <div className="confirm-acao-row">
                    <input
                      id="cpf"
                      inputMode="numeric"
                      className="input"
                      placeholder="000.000.000-00"
                      value={cpf}
                      maxLength={14}
                      onChange={(e) => setCpf(maskCpf(e.target.value))}
                    />
                    <button className="btn btn-emerald btn-sm" onClick={inserirCpf} disabled={cpf.replace(/\D/g, '').length !== 11}>
                      Confirmar
                    </button>
                  </div>
                </div>
              )}

              {detalhe.status === 'em_negociacao' && (
                <div className="banner banner-success" style={{ marginTop: '0.9rem' }}>
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
                      <div className="confirm-acao" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                        <label htmlFor="valor">Declarar venda — valor final (R$)</label>
                        <div className="confirm-acao-row">
                          <input
                            id="valor"
                            inputMode="numeric"
                            className="input"
                            placeholder="Ex.: 500000"
                            value={valorVenda}
                            onChange={(e) => setValorVenda(e.target.value)}
                          />
                          <button className="btn btn-emerald btn-sm" onClick={declararVenda}>
                            Declarar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="muted" style={{ fontSize: '0.86rem', margin: 0 }}>
                        A declaração da venda é feita pelo corretor captador.
                      </p>
                    )}
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }} onClick={encerrar}>
                      Encerrar sem venda
                    </button>
                  </>
                )}

                {detalhe.venda && (
                  <>
                    <div className="info-stack">
                      <div className="info-item">
                        <span className="info-dt">Valor da venda</span>
                        <span className="info-dd destaque">{formatBRL(detalhe.venda.valor)}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-dt">Comissão (5%)</span>
                        <span className="info-dd">{formatBRL(detalhe.venda.comissao)}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-dt">Taxa da plataforma (10% da comissão)</span>
                        <span className="info-dd">{formatBRL(detalhe.venda.taxa_plataforma)}</span>
                      </div>
                    </div>
                    {detalhe.venda.pagamento_status === 'pendente' && (
                      <div className="banner banner-warning" style={{ marginTop: '0.75rem' }}>
                        Pagamento da taxa via PIX pendente
                        {detalhe.venda.pagamento_vencimento
                          ? ` — vence em ${new Date(detalhe.venda.pagamento_vencimento).toLocaleDateString('pt-BR')}`
                          : ''}
                        . A equipe confirma o recebimento.
                      </div>
                    )}
                    {detalhe.venda.pagamento_status === 'confirmado' && (
                      <div className="banner banner-success" style={{ marginTop: '0.75rem' }}>Pagamento confirmado pela equipe.</div>
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
                <h3 className="detail-label">Contatos liberados</h3>
                <div className="info-stack">
                  <div className="info-item">
                    <span className="info-dt">Captador</span>
                    <span className="info-dd">{detalhe.contatos.captador.nome}</span>
                    {detalhe.contatos.captador.whatsapp && (
                      <a className="info-wa" href={waLink(detalhe.contatos.captador.whatsapp) ?? '#'} target="_blank" rel="noopener noreferrer">
                        {detalhe.contatos.captador.whatsapp}
                      </a>
                    )}
                  </div>
                  <div className="info-item">
                    <span className="info-dt">Comprador</span>
                    <span className="info-dd">{detalhe.contatos.comprador.nome}</span>
                    {detalhe.contatos.comprador.whatsapp && (
                      <a className="info-wa" href={waLink(detalhe.contatos.comprador.whatsapp) ?? '#'} target="_blank" rel="noopener noreferrer">
                        {detalhe.contatos.comprador.whatsapp}
                      </a>
                    )}
                  </div>
                  {detalhe.papel === 'captador' && detalhe.confirmacao.cpf_cliente && (
                    <div className="info-item">
                      <span className="info-dt">CPF do cliente</span>
                      <span className="info-dd">{maskCpf(detalhe.confirmacao.cpf_cliente)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chat — mora na central de conversas */}
            <Link href={`/conversas/${detalhe.id}`} className="card chat-atalho">
              <span className="chat-atalho-ico" aria-hidden>💬</span>
              <span className="chat-atalho-info">
                <strong>Conversa com {detalhe.outro_nome}</strong>
                <span className="muted">
                  {mensagens.length > 0
                    ? mensagens[mensagens.length - 1].corpo
                    : 'Combine a visita pelo chat.'}
                </span>
              </span>
              <span className="chat-atalho-seta" aria-hidden>→</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
