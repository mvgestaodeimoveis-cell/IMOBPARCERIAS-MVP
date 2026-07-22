'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { formatMilhar, maskCep, parseNumero } from '@/lib/masks';
import { getAccessToken } from '@/lib/auth';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { reportarErro } from '@/lib/telemetry';
import { AppHeader } from '@/components/AppHeader';
import { PhotoUploader } from '@/components/PhotoUploader';

type Finalidade = 'venda' | 'aluguel';
type Tipo = 'apartamento' | 'casa' | 'terreno' | 'comercial';

interface Imovel {
  id: string;
  finalidade: string;
  tipo: string;
  preco: number;
  cidade: string;
  bairro: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  condominio: number | null;
  iptu: number | null;
  taxas_inclusas: boolean;
  area_m2: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  descricao: string | null;
  diferenciais: string[];
  fotos: string[];
  status: string;
}

const DIFERENCIAIS_SUGERIDOS = [
  'Piscina',
  'Academia',
  'Varanda',
  'Churrasqueira',
  'Portaria 24h',
  'Elevador',
  'Mobiliado',
  'Área de lazer',
  'Pet friendly',
  'Ar-condicionado',
  'Salão de festas',
  'Vista livre',
];

function Stepper({
  label,
  value,
  onDelta,
}: {
  label: string;
  value: number;
  onDelta: (d: number) => void;
}) {
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-ctrl">
        <button type="button" aria-label={`Diminuir ${label}`} onClick={() => onDelta(-1)}>
          −
        </button>
        <span className="stepper-val">{value}</span>
        <button type="button" aria-label={`Aumentar ${label}`} onClick={() => onDelta(1)}>
          +
        </button>
      </div>
    </div>
  );
}

export default function EditarImovelPage() {
  const router = useRouter();
  const token = useAuthGuard();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [finalidade, setFinalidade] = useState<Finalidade>('venda');
  const [tipo, setTipo] = useState<Tipo>('apartamento');
  const [form, setForm] = useState({
    preco: '',
    area_m2: '',
    condominio: '',
    iptu: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    descricao: '',
  });
  const [taxasInclusas, setTaxasInclusas] = useState(false);
  const [counts, setCounts] = useState({ quartos: 0, suites: 0, banheiros: 0, vagas: 0 });
  const [diferenciais, setDiferenciais] = useState<string[]>([]);
  const [difInput, setDifInput] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    if (!token) return;
    apiFetch<Imovel>(`/imoveis/${id}`, { token })
      .then((im) => {
        setFinalidade(im.finalidade === 'aluguel' ? 'aluguel' : 'venda');
        setTipo((im.tipo as Tipo) ?? 'apartamento');
        setForm({
          preco: im.preco ? formatMilhar(String(Math.round(im.preco))) : '',
          area_m2: im.area_m2 != null ? String(im.area_m2) : '',
          condominio: im.condominio != null ? formatMilhar(String(Math.round(im.condominio))) : '',
          iptu: im.iptu != null ? formatMilhar(String(Math.round(im.iptu))) : '',
          cep: maskCep(im.cep ?? ''),
          logradouro: im.logradouro ?? '',
          numero: im.numero ?? '',
          complemento: im.complemento ?? '',
          bairro: im.bairro ?? '',
          cidade: im.cidade ?? '',
          descricao: im.descricao ?? '',
        });
        setTaxasInclusas(Boolean(im.taxas_inclusas));
        setCounts({
          quartos: im.quartos ?? 0,
          suites: im.suites ?? 0,
          banheiros: im.banheiros ?? 0,
          vagas: im.vagas ?? 0,
        });
        setDiferenciais(im.diferenciais ?? []);
        setFotos(im.fotos ?? []);
      })
      .catch((err) => {
        setErro(err instanceof ApiRequestError ? err.message : 'Imóvel não encontrado.');
      })
      .finally(() => setCarregando(false));
  }, [id, token]);

  function toggleDiferencial(d: string) {
    setDiferenciais((atual) => (atual.includes(d) ? atual.filter((x) => x !== d) : [...atual, d]));
  }

  function addDifCustom() {
    const d = difInput.trim();
    if (d && !diferenciais.includes(d)) setDiferenciais((atual) => [...atual, d]);
    setDifInput('');
  }

  async function salvar() {
    const accessToken = getAccessToken();
    if (!accessToken) return;
    setErro(null);

    const preco = parseNumero(form.preco);
    if (!preco || preco <= 0) {
      setErro('Informe um preço válido.');
      return;
    }

    const payload = {
      finalidade,
      tipo,
      preco,
      area_m2: parseNumero(form.area_m2),
      cep: form.cep,
      logradouro: form.logradouro.trim(),
      numero: form.numero.trim(),
      complemento: form.complemento.trim() || undefined,
      bairro: form.bairro.trim(),
      cidade: form.cidade.trim(),
      quartos: counts.quartos,
      suites: counts.suites,
      banheiros: counts.banheiros,
      vagas: counts.vagas,
      descricao: form.descricao.trim() || undefined,
      diferenciais,
      fotos,
      taxas_inclusas: finalidade === 'aluguel' ? taxasInclusas : false,
      condominio:
        finalidade === 'aluguel' && !taxasInclusas ? parseNumero(form.condominio) : undefined,
      iptu: finalidade === 'aluguel' && !taxasInclusas ? parseNumero(form.iptu) : undefined,
    };

    setSalvando(true);
    try {
      await apiFetch(`/imoveis/${id}`, { method: 'PATCH', token: accessToken, body: payload });
      router.push(`/imoveis/${id}`);
    } catch (err) {
      reportarErro('editar-imovel', err, { id, fotos: fotos.length });
      setErro(
        err instanceof ApiRequestError ? err.message : 'Não foi possível salvar as alterações.',
      );
      setSalvando(false);
    }
  }

  return (
    <div className="frame frame-app">
      <AppHeader back={{ href: `/imoveis/${id}`, label: 'Voltar' }} />

      <div className="screen">
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Editar imóvel</h1>

        {erro && <div className="banner banner-error">{erro}</div>}

        {carregando ? (
          <p className="muted">Carregando…</p>
        ) : (
          <>
            <div className="field">
              <label>Fotos</label>
              <p className="muted" style={{ margin: '0 0 0.6rem', fontSize: '0.84rem' }}>
                A primeira foto é a capa. Use ‹ › para reordenar ou toque em “Tornar capa”.
              </p>
              <PhotoUploader value={fotos} onChange={setFotos} max={20} />
            </div>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="finalidade">Finalidade</label>
                <select
                  id="finalidade"
                  className="input"
                  value={finalidade}
                  onChange={(e) => setFinalidade(e.target.value as Finalidade)}
                >
                  <option value="venda">Venda</option>
                  <option value="aluguel">Aluguel</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="tipo">Tipo</label>
                <select
                  id="tipo"
                  className="input"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as Tipo)}
                >
                  <option value="apartamento">Apartamento</option>
                  <option value="casa">Casa</option>
                  <option value="terreno">Terreno</option>
                  <option value="comercial">Comercial</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="preco">Preço</label>
                <div className="input-prefix">
                  <span>R$</span>
                  <input
                    id="preco"
                    inputMode="numeric"
                    placeholder="450.000"
                    value={form.preco}
                    onChange={(e) => set('preco', formatMilhar(e.target.value))}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="area_m2">Metragem</label>
                <div className="input-prefix input-suffix">
                  <input
                    id="area_m2"
                    inputMode="numeric"
                    placeholder="90"
                    value={form.area_m2}
                    onChange={(e) => set('area_m2', e.target.value.replace(/\D/g, ''))}
                  />
                  <span>m²</span>
                </div>
              </div>
            </div>

            {finalidade === 'aluguel' && (
              <div className="field">
                <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={taxasInclusas}
                    onChange={(e) => setTaxasInclusas(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>Condomínio e IPTU inclusos no valor do aluguel</span>
                </label>
                <div className="grid-2" style={{ marginTop: '0.6rem' }}>
                  <div className="field">
                    <label htmlFor="condominio">Condomínio (mês)</label>
                    <div className="input-prefix">
                      <span>R$</span>
                      <input
                        id="condominio"
                        inputMode="numeric"
                        placeholder="0"
                        disabled={taxasInclusas}
                        value={form.condominio}
                        onChange={(e) => set('condominio', formatMilhar(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="iptu">IPTU (mês)</label>
                    <div className="input-prefix">
                      <span>R$</span>
                      <input
                        id="iptu"
                        inputMode="numeric"
                        placeholder="0"
                        disabled={taxasInclusas}
                        value={form.iptu}
                        onChange={(e) => set('iptu', formatMilhar(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="steppers">
              <Stepper label="Quartos" value={counts.quartos} onDelta={(d) => setCounts((c) => ({ ...c, quartos: Math.max(0, Math.min(50, c.quartos + d)) }))} />
              <Stepper label="Suítes" value={counts.suites} onDelta={(d) => setCounts((c) => ({ ...c, suites: Math.max(0, Math.min(50, c.suites + d)) }))} />
              <Stepper label="Banheiros" value={counts.banheiros} onDelta={(d) => setCounts((c) => ({ ...c, banheiros: Math.max(0, Math.min(50, c.banheiros + d)) }))} />
              <Stepper label="Vagas" value={counts.vagas} onDelta={(d) => setCounts((c) => ({ ...c, vagas: Math.max(0, Math.min(50, c.vagas + d)) }))} />
            </div>

            <div className="field" style={{ marginTop: '1.25rem' }}>
              <label>Diferenciais</label>
              <div className="sug-chips">
                {DIFERENCIAIS_SUGERIDOS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`sug-chip ${diferenciais.includes(d) ? 'on' : ''}`}
                    onClick={() => toggleDiferencial(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="import-row" style={{ marginTop: '0.6rem' }}>
                <input
                  className="input"
                  placeholder="Outro diferencial…"
                  value={difInput}
                  onChange={(e) => setDifInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addDifCustom();
                    }
                  }}
                />
                <button type="button" className="btn btn-ghost" onClick={addDifCustom}>
                  Adicionar
                </button>
              </div>
              {diferenciais.filter((d) => !DIFERENCIAIS_SUGERIDOS.includes(d)).length > 0 && (
                <div className="chips" style={{ marginTop: '0.6rem' }}>
                  {diferenciais
                    .filter((d) => !DIFERENCIAIS_SUGERIDOS.includes(d))
                    .map((d) => (
                      <span key={d} className="chip">
                        {d}
                        <button type="button" aria-label="Remover" onClick={() => toggleDiferencial(d)}>
                          ×
                        </button>
                      </span>
                    ))}
                </div>
              )}
            </div>

            <h2 className="wizard-q">Endereço</h2>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="cep">CEP</label>
                <input
                  id="cep"
                  className="input"
                  inputMode="numeric"
                  placeholder="00000-000"
                  value={form.cep}
                  onChange={(e) => set('cep', maskCep(e.target.value))}
                />
              </div>
              <div className="field">
                <label htmlFor="numero">Número</label>
                <input
                  id="numero"
                  className="input"
                  placeholder="123"
                  value={form.numero}
                  onChange={(e) => set('numero', e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="logradouro">Logradouro</label>
              <input
                id="logradouro"
                className="input"
                placeholder="Rua / Avenida"
                value={form.logradouro}
                onChange={(e) => set('logradouro', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="complemento">Complemento</label>
              <input
                id="complemento"
                className="input"
                placeholder="Apto, bloco, referência…"
                value={form.complemento}
                onChange={(e) => set('complemento', e.target.value)}
              />
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="bairro">Bairro</label>
                <input
                  id="bairro"
                  className="input"
                  value={form.bairro}
                  onChange={(e) => set('bairro', e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="cidade">Cidade</label>
                <input
                  id="cidade"
                  className="input"
                  value={form.cidade}
                  onChange={(e) => set('cidade', e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="descricao">Descrição</label>
              <textarea
                id="descricao"
                className="input"
                rows={4}
                placeholder="Detalhes do imóvel…"
                value={form.descricao}
                onChange={(e) => set('descricao', e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1rem' }}>
              <button className="btn btn-emerald" disabled={salvando} onClick={salvar}>
                {salvando ? 'Salvando…' : 'Salvar alterações'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={salvando}
                onClick={() => router.push(`/imoveis/${id}`)}
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
