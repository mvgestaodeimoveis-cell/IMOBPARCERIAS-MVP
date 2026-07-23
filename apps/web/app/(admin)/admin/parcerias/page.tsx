'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { getAccessToken, getRole } from '@/lib/auth';
import { formatBRL } from '@/lib/masks';
import { tempoRelativo } from '@/lib/format';
import { TIPO_LABEL, PARCERIA_STATUS_LABEL as STATUS_LABEL } from '@/lib/labels';

interface ParceriaRow {
  id: string;
  status: string;
  cliente_nome: string;
  criado_em: string;
  atualizado_em: string;
  visita_em: string | null;
  visita_confirmada_em: string | null;
  confirmada_em: string | null;
  venda_declarada_em: string | null;
  venda_valor: number | null;
  pagamento_status: string;
  total_mensagens: number;
  imovel: { tipo: string; bairro: string; cidade: string; preco: number };
  captador_nome: string;
  comprador_nome: string;
}

interface ListResponse {
  data: ParceriaRow[];
  resumo: Record<string, number>;
}

const STATUS_BADGE: Record<string, string> = {
  solicitada: 'badge-amber',
  aceita: 'badge-emerald',
  em_negociacao: 'badge-orange',
  vendida: 'badge-emerald',
  encerrada: 'badge-gray',
  recusada: 'badge-red',
  cancelada: 'badge-gray',
};

const FILTROS = ['', 'solicitada', 'aceita', 'em_negociacao', 'vendida', 'encerrada', 'recusada', 'cancelada'];

function Kpi({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="card" style={{ margin: 0 }}>
      <p className="muted" style={{ margin: 0, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ margin: '0.1rem 0 0', fontSize: '1.6rem', fontWeight: 700 }}>{valor}</p>
    </div>
  );
}

// Estágio do "desenrolar" da parceria, em texto curto.
function etapa(p: ParceriaRow): string {
  if (['recusada', 'cancelada'].includes(p.status)) return 'Encerrada sem seguir';
  if (p.status === 'vendida') return 'Venda declarada';
  if (p.status === 'encerrada') return 'Encerrada';
  if (p.status === 'em_negociacao') return 'Em negociação (visita + CPF confirmados)';
  if (p.status === 'aceita') {
    if (p.visita_confirmada_em) return 'Visita confirmada — aguardando CPF';
    if (p.visita_em) return 'Visita proposta — aguardando confirmação';
    return 'Aceita — combinando a visita';
  }
  return 'Aguardando o captador aceitar';
}

export default function AdminParceriasPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ParceriaRow[]>([]);
  const [resumo, setResumo] = useState<Record<string, number>>({});
  const [status, setStatus] = useState('');
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
      const res = await apiFetch<ListResponse>(`/admin/parcerias?${params.toString()}`, { token });
      setRows(res.data);
      setResumo(res.resumo);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'UNAUTHENTICATED') {
        router.replace('/admin/login');
        return;
      }
      setErro('Não foi possível carregar as parcerias.');
    } finally {
      setLoading(false);
    }
  }, [router, status]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const total = Object.values(resumo).reduce((a, b) => a + b, 0);
  const ativas = (resumo.solicitada ?? 0) + (resumo.aceita ?? 0) + (resumo.em_negociacao ?? 0);

  return (
    <>
      <h1 style={{ fontSize: '1.5rem' }}>Parcerias ({total})</h1>

      <div className="metricas-grid" style={{ marginBottom: '1rem' }}>
        <Kpi label="Em andamento" valor={ativas} />
        <Kpi label="Aguardando aceite" valor={resumo.solicitada ?? 0} />
        <Kpi label="Em negociação" valor={resumo.em_negociacao ?? 0} />
        <Kpi label="Vendidas" valor={resumo.vendida ?? 0} />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select className="input" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {FILTROS.map((s) => (
            <option key={s} value={s}>{s ? (STATUS_LABEL[s] ?? s) : 'Todas'}</option>
          ))}
        </select>
      </div>

      {erro && <div className="banner banner-error">{erro}</div>}
      {loading ? (
        <p className="muted">Carregando…</p>
      ) : rows.length === 0 ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>Nenhuma parceria neste filtro.</p></div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Imóvel</th>
              <th>Corretores</th>
              <th>Estágio</th>
              <th>Status</th>
              <th>Atualizada</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  {TIPO_LABEL[p.imovel.tipo] ?? p.imovel.tipo} · {p.imovel.bairro}, {p.imovel.cidade}
                  <br />
                  <span className="muted">{formatBRL(p.imovel.preco)} · cliente: {p.cliente_nome}</span>
                </td>
                <td>
                  <span title="Captador (dono do imóvel)">🏠 {p.captador_nome}</span>
                  <br />
                  <span className="muted" title="Comprador (solicitante)">🤝 {p.comprador_nome}</span>
                  {p.total_mensagens > 0 && <><br /><span className="muted">💬 {p.total_mensagens} msg</span></>}
                </td>
                <td style={{ fontSize: '0.84rem' }}>
                  {etapa(p)}
                  {p.venda_valor != null && <><br /><span className="muted">Venda: {formatBRL(p.venda_valor)}</span></>}
                </td>
                <td>
                  <span className={`badge badge-dot ${STATUS_BADGE[p.status] ?? 'badge-gray'}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </td>
                <td>{tempoRelativo(p.atualizado_em)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
