'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { getAccessToken, getRole } from '@/lib/auth';
import { tempoRelativo, waLink } from '@/lib/format';
import { formatBRL } from '@/lib/masks';
import { TIPO_LABEL } from '@/lib/labels';

interface ImovelLado {
  id: string;
  bairro: string;
  cidade: string;
  preco: number;
  logradouro: string;
  numero: string;
  status: string;
  corretor_nome: string;
  corretor_email: string;
  corretor_whatsapp: string | null;
}

interface Suspeita {
  id: string;
  motivo: string;
  status: string;
  criado_em: string;
  revisado_em: string | null;
  resolucao_nota: string | null;
  novo: ImovelLado & { tipo: string };
  existente: ImovelLado;
}

interface ListResponse {
  data: Suspeita[];
  pendentes: number;
}

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  pendente: { cls: 'badge-amber', label: 'Pendente' },
  revisada: { cls: 'badge-emerald', label: 'Revisada' },
};

const IMOVEL_STATUS_LABEL: Record<string, string> = {
  ativo: 'Na vitrine',
  em_negociacao: 'Em negociação',
  vendido: 'Vendido',
  inativo: 'Inativo',
};

const FILTROS = ['', 'pendente', 'revisada'];

function LadoImovel({ titulo, imovel }: { titulo: string; imovel: ImovelLado }) {
  return (
    <div className="info-item">
      <span className="info-dt">{titulo}</span>
      <span className="info-dd">
        {imovel.logradouro}, {imovel.numero} — {imovel.bairro}, {imovel.cidade}
      </span>
      <span className="muted" style={{ fontSize: '0.8rem' }}>
        {formatBRL(imovel.preco)} · {IMOVEL_STATUS_LABEL[imovel.status] ?? imovel.status} · por{' '}
        <strong>{imovel.corretor_nome}</strong>
      </span>
      <a className="info-wa" href={`mailto:${imovel.corretor_email}`}>{imovel.corretor_email}</a>
      {imovel.corretor_whatsapp && (
        <a className="info-wa" href={waLink(imovel.corretor_whatsapp) ?? '#'} target="_blank" rel="noopener noreferrer">
          WhatsApp: {imovel.corretor_whatsapp}
        </a>
      )}
      <a className="info-wa" href={`/admin/imoveis?busca=${encodeURIComponent(imovel.corretor_email)}`}>
        Ver nos imóveis →
      </a>
    </div>
  );
}

export default function AdminDuplicatasPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Suspeita[]>([]);
  const [pendentes, setPendentes] = useState(0);
  const [status, setStatus] = useState('pendente');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aberta, setAberta] = useState<Suspeita | null>(null);
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
      const res = await apiFetch<ListResponse>(`/admin/duplicatas?${params.toString()}`, { token });
      setRows(res.data);
      setPendentes(res.pendentes);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'UNAUTHENTICATED') {
        router.replace('/admin/login');
        return;
      }
      setErro('Não foi possível carregar as duplicatas suspeitas.');
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
      await apiFetch(`/admin/duplicatas/${aberta.id}/resolver`, {
        method: 'POST',
        token,
        body: { nota: nota.trim() },
      });
      setAberta(null);
      setNota('');
      carregar();
    } catch (err) {
      alert(err instanceof ApiRequestError ? err.message : 'Erro ao registrar a decisão.');
    } finally {
      setSalvando(false);
    }
  }

  function abrir(s: Suspeita) {
    setAberta(s);
    setNota(s.resolucao_nota ?? '');
  }

  return (
    <>
      <h1 style={{ fontSize: '1.5rem' }}>
        Duplicatas suspeitas{' '}
        {pendentes > 0 && <span className="badge badge-amber">{pendentes} pendente(s)</span>}
      </h1>
      <p className="muted" style={{ marginTop: '-0.4rem', fontSize: '0.85rem' }}>
        Casas/terrenos de corretores diferentes no mesmo tipo, cidade, bairro e faixa de preço cujos
        endereços foram digitados de formas distintas (a chave de deduplicação não pegou).
      </p>

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
        <div className="card"><p className="muted" style={{ margin: 0 }}>Nenhuma suspeita neste filtro.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {rows.map((s) => (
            <div key={s.id} className="card" style={{ padding: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.95rem' }}>
                  {TIPO_LABEL[s.novo.tipo] ?? s.novo.tipo} em {s.novo.bairro}, {s.novo.cidade}
                </strong>
                <span className={`badge badge-dot ${STATUS_BADGE[s.status]?.cls ?? 'badge-gray'}`}>
                  {STATUS_BADGE[s.status]?.label ?? s.status}
                </span>
              </div>
              <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
                {formatBRL(s.novo.preco)} vs {formatBRL(s.existente.preco)} · {tempoRelativo(s.criado_em)}
              </p>
              <p style={{ margin: '0.55rem 0 0', fontSize: '0.85rem' }}>
                <strong>{s.novo.corretor_nome}</strong> cadastrou algo muito parecido com o de{' '}
                <strong>{s.existente.corretor_nome}</strong>.
              </p>
              <button className="btn btn-ghost btn-sm" style={{ width: 'auto', marginTop: '0.7rem' }} onClick={() => abrir(s)}>
                {s.status === 'revisada' ? 'Ver detalhes' : 'Analisar'}
              </button>
            </div>
          ))}
        </div>
      )}

      {aberta && (
        <div className="modal-overlay" onClick={() => setAberta(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Comparar os dois imóveis</h2>
              <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={() => setAberta(null)}>Fechar</button>
            </div>

            <p className="muted" style={{ margin: '0.4rem 0 0', fontSize: '0.82rem' }}>
              {aberta.motivo}
            </p>

            <div className="info-stack" style={{ marginTop: '0.85rem' }}>
              <LadoImovel titulo="Cadastro mais novo" imovel={aberta.novo} />
              <LadoImovel titulo="Já existia na plataforma" imovel={aberta.existente} />
            </div>

            {aberta.status === 'revisada' ? (
              <div className="banner banner-success" style={{ marginTop: '1rem' }}>
                Revisada em {aberta.revisado_em ? new Date(aberta.revisado_em).toLocaleString('pt-BR') : '—'}.
                {aberta.resolucao_nota && <><br /><strong>Decisão:</strong> {aberta.resolucao_nota}</>}
              </div>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                <label className="detail-label" htmlFor="nota">Qual foi a decisão?</label>
                <textarea
                  id="nota"
                  className="input"
                  placeholder="Ex.: são o mesmo imóvel — falei com os dois corretores e um vai virar parceria; ou: imóveis distintos, apenas próximos."
                  maxLength={2000}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  style={{ minHeight: 100 }}
                />
                <button className="btn btn-emerald" style={{ marginTop: '0.75rem' }} onClick={resolver} disabled={salvando || nota.trim().length < 3}>
                  {salvando ? 'Salvando…' : 'Marcar como revisada'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
