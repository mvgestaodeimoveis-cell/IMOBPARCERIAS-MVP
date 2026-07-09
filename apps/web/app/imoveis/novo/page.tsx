'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { formatMilhar, maskCep, parseNumero } from '@/lib/masks';
import { getAccessToken } from '@/lib/auth';
import { Brandmark } from '@/components/Brandmark';
import { PhotoUploader } from '@/components/PhotoUploader';

type Finalidade = 'venda' | 'aluguel';
type Tipo = 'apartamento' | 'casa' | 'terreno' | 'comercial';

interface Draft {
  titulo?: string;
  descricao?: string;
  preco?: number;
  fotos: string[];
  cidade?: string;
  bairro?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  tipo?: Tipo;
  finalidade?: Finalidade;
  area_m2?: number;
  quartos?: number;
  banheiros?: number;
  vagas?: number;
}

const FINALIDADES: { value: Finalidade; label: string; ico: string }[] = [
  { value: 'venda', label: 'Venda', ico: '🏷️' },
  { value: 'aluguel', label: 'Aluguel', ico: '🔑' },
];

const TIPOS: { value: Tipo; label: string; ico: string }[] = [
  { value: 'apartamento', label: 'Apartamento', ico: '🏢' },
  { value: 'casa', label: 'Casa', ico: '🏠' },
  { value: 'terreno', label: 'Terreno', ico: '🌳' },
  { value: 'comercial', label: 'Comercial', ico: '🏬' },
];

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

const TOTAL_ETAPAS = 5;
const TITULOS = ['Tipo do anúncio', 'Localização', 'Detalhes', 'Fotos', 'Revisão'];

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

export default function NovoImovelPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    finalidade: 'venda' as Finalidade,
    tipo: 'apartamento' as Tipo,
    preco: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    unidade: '',
    andar: '',
    bloco: '',
    nome_condominio: '',
    bairro: '',
    cidade: '',
    area_m2: '',
    descricao: '',
  });
  const [emCondominio, setEmCondominio] = useState(false);
  const [counts, setCounts] = useState({ quartos: 0, suites: 0, banheiros: 0, vagas: 0 });
  const [diferenciais, setDiferenciais] = useState<string[]>([]);
  const [difInput, setDifInput] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const [importUrl, setImportUrl] = useState('');
  const [importando, setImportando] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [linkOrigem, setLinkOrigem] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((e) => ({ ...e, [key]: '' }));
  }

  function toggleDiferencial(d: string) {
    setDiferenciais((arr) => (arr.includes(d) ? arr.filter((x) => x !== d) : [...arr, d].slice(0, 20)));
  }

  function addDifCustom() {
    const v = difInput.trim();
    if (!v) return;
    setDiferenciais((d) => (d.includes(v) || d.length >= 20 ? d : [...d, v]));
    setDifInput('');
  }

  async function onCepBlur() {
    const d = form.cep.replace(/\D/g, '');
    if (d.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((f) => ({
          ...f,
          logradouro: data.logradouro || f.logradouro,
          bairro: data.bairro || f.bairro,
          cidade: data.localidade || f.cidade,
        }));
      }
    } catch {
      /* silencioso — o usuário preenche manualmente */
    } finally {
      setCepLoading(false);
    }
  }

  async function importar() {
    if (!importUrl.trim()) return;
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setImportMsg(null);
    setImportando(true);
    try {
      const d = await apiFetch<Draft>('/imoveis/importar', {
        method: 'POST',
        token,
        body: { url: importUrl.trim() },
      });
      setForm((f) => ({
        ...f,
        finalidade: d.finalidade ?? f.finalidade,
        tipo: d.tipo ?? f.tipo,
        preco: d.preco != null ? formatMilhar(String(Math.round(d.preco))) : f.preco,
        cep: d.cep ? maskCep(d.cep) : f.cep,
        logradouro: d.logradouro ?? f.logradouro,
        numero: d.numero ?? f.numero,
        bairro: d.bairro ?? f.bairro,
        cidade: d.cidade ?? f.cidade,
        area_m2: d.area_m2 != null ? String(Math.round(d.area_m2)) : f.area_m2,
        descricao: d.descricao ?? d.titulo ?? f.descricao,
      }));
      setCounts((c) => ({
        quartos: d.quartos ?? c.quartos,
        suites: c.suites,
        banheiros: d.banheiros ?? c.banheiros,
        vagas: d.vagas ?? c.vagas,
      }));
      if (d.fotos && d.fotos.length > 0) setFotos((atuais) => [...atuais, ...d.fotos].slice(0, 10));
      setLinkOrigem(importUrl.trim());
      setImportMsg('Dados importados! Revise cada etapa e complete o que faltar.');
      setStep(2);
    } catch (err) {
      setImportMsg(
        err instanceof ApiRequestError ? err.message : 'Não foi possível importar deste link.',
      );
    } finally {
      setImportando(false);
    }
  }

  function validarEtapa(): boolean {
    const e: Record<string, string> = {};
    if (step === 2) {
      if (form.cep.replace(/\D/g, '').length !== 8) e.cep = 'Informe um CEP válido.';
      if (!form.logradouro.trim()) e.logradouro = 'Informe o logradouro.';
      if (!form.numero.trim()) e.numero = 'Informe o número.';
      if (!form.bairro.trim()) e.bairro = 'Informe o bairro.';
      if (!form.cidade.trim()) e.cidade = 'Informe a cidade.';
      if ((form.tipo === 'apartamento' || form.tipo === 'comercial') && !form.unidade.trim()) {
        e.unidade = form.tipo === 'apartamento' ? 'Informe a unidade/apto.' : 'Informe a sala/unidade.';
      }
      if (form.tipo === 'apartamento' && !form.andar.trim()) e.andar = 'Informe o andar.';
    }
    if (step === 3) {
      if (!parseNumero(form.preco)) e.preco = 'Informe o preço.';
      if (!parseNumero(form.area_m2)) e.area_m2 = 'Informe a metragem.';
      if (diferenciais.length === 0) e.diferenciais = 'Escolha ao menos 1 diferencial.';
    }
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  function avancar() {
    setErro(null);
    if (!validarEtapa()) return;
    setStep((s) => Math.min(TOTAL_ETAPAS, s + 1));
  }

  function voltar() {
    setErro(null);
    if (step === 1) router.push('/painel');
    else setStep((s) => s - 1);
  }

  async function publicar(confirmarDistinto = false) {
    setErro(null);
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    const payload = {
      finalidade: form.finalidade,
      tipo: form.tipo,
      preco: parseNumero(form.preco) ?? 0,
      cep: form.cep,
      logradouro: form.logradouro,
      numero: form.numero,
      complemento: form.complemento || undefined,
      unidade: form.unidade || undefined,
      andar: form.andar || undefined,
      bloco: form.bloco || undefined,
      nome_condominio: emCondominio ? form.nome_condominio || undefined : undefined,
      bairro: form.bairro,
      cidade: form.cidade,
      area_m2: parseNumero(form.area_m2),
      quartos: counts.quartos,
      suites: counts.suites,
      banheiros: counts.banheiros,
      vagas: counts.vagas,
      descricao: form.descricao || undefined,
      diferenciais,
      fotos,
      link_origem: linkOrigem ?? undefined,
      confirmar_distinto: confirmarDistinto,
    };
    setLoading(true);
    try {
      await apiFetch('/imoveis', { method: 'POST', token, body: payload });
      router.push('/painel?imovel=ok');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === 'DUPLICATA_POSSIVEL' && !confirmarDistinto) {
          setLoading(false);
          if (
            window.confirm(
              `${err.message}\n\nConfirmo que é uma unidade/imóvel diferente. Publicar mesmo assim?`,
            )
          ) {
            return publicar(true);
          }
          return;
        }
        setErro(err.message);
        if (err.fields) {
          setFieldErrors(err.fields);
          if (err.fields.cep || err.fields.logradouro || err.fields.numero || err.fields.bairro || err.fields.cidade || err.fields.unidade || err.fields.andar) setStep(2);
          else if (err.fields.preco || err.fields.area_m2) setStep(3);
        }
      } else {
        setErro('Não foi possível publicar o imóvel.');
      }
    } finally {
      setLoading(false);
    }
  }

  const tipoLabel = TIPOS.find((t) => t.value === form.tipo)?.label ?? form.tipo;

  return (
    <div className="frame frame-app wizard-frame">
      <header className="topbar">
        <Brandmark />
        <Link href="/painel" className="auth-back">
          <span aria-hidden>←</span> Sair
        </Link>
      </header>

      <div className="wizard-progress">
        <div className="prog-track">
          <div className="prog-fill" style={{ width: `${(step / TOTAL_ETAPAS) * 100}%` }} />
        </div>
        <p className="prog-label">
          Etapa {step} de {TOTAL_ETAPAS} · <strong>{TITULOS[step - 1]}</strong>
        </p>
      </div>

      <div className="wizard-body">
        {erro && <div className="banner banner-error">{erro}</div>}

        {/* ETAPA 1 — Tipo do anúncio */}
        {step === 1 && (
          <>
            <div className="card import-box">
              <h3 className="import-title">Já anunciou em outro site?</h3>
              <p className="muted" style={{ margin: '0 0 0.75rem', fontSize: '0.88rem' }}>
                Cole o link (OLX, VivaReal, ZAP, Chaves na Mão, site próprio…) e preenchemos o que
                for possível para você revisar.
              </p>
              <div className="import-row">
                <input
                  className="input"
                  type="url"
                  placeholder="https://…"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-navy"
                  disabled={importando || !importUrl.trim()}
                  onClick={importar}
                >
                  {importando ? 'Importando…' : 'Importar'}
                </button>
              </div>
              {importMsg && <div className="import-msg">{importMsg}</div>}
            </div>

            <h2 className="wizard-q">Qual é a finalidade?</h2>
            <div className="choice-grid">
              {FINALIDADES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={`choice-card ${form.finalidade === f.value ? 'selected' : ''}`}
                  onClick={() => set('finalidade', f.value)}
                >
                  <span className="choice-ico">{f.ico}</span>
                  {f.label}
                </button>
              ))}
            </div>

            <h2 className="wizard-q">Qual é o tipo do imóvel?</h2>
            <div className="choice-grid choice-grid-2">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`choice-card ${form.tipo === t.value ? 'selected' : ''}`}
                  onClick={() => set('tipo', t.value)}
                >
                  <span className="choice-ico">{t.ico}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ETAPA 2 — Localização */}
        {step === 2 && (
          <>
            <h2 className="wizard-q">Onde fica o imóvel?</h2>
            <p className="muted" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.88rem' }}>
              O endereço completo <strong>nunca</strong> aparece na vitrine — serve só para a
              verificação de exclusividade.
            </p>

            <div className="field">
              <label htmlFor="cep">CEP</label>
              <input
                id="cep"
                className={`input ${fieldErrors.cep ? 'error' : ''}`}
                inputMode="numeric"
                placeholder="41000-000"
                maxLength={9}
                value={form.cep}
                onChange={(e) => set('cep', maskCep(e.target.value))}
                onBlur={onCepBlur}
              />
              {cepLoading ? (
                <div className="field-hint">Buscando endereço…</div>
              ) : (
                fieldErrors.cep && <div className="field-error">{fieldErrors.cep}</div>
              )}
            </div>

            <div className="field">
              <label htmlFor="logradouro">Logradouro</label>
              <input
                id="logradouro"
                className={`input ${fieldErrors.logradouro ? 'error' : ''}`}
                placeholder="Rua / Avenida"
                value={form.logradouro}
                onChange={(e) => set('logradouro', e.target.value)}
              />
              {fieldErrors.logradouro && <div className="field-error">{fieldErrors.logradouro}</div>}
            </div>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="numero">Número</label>
                <input
                  id="numero"
                  className={`input ${fieldErrors.numero ? 'error' : ''}`}
                  placeholder="123"
                  value={form.numero}
                  onChange={(e) => set('numero', e.target.value)}
                />
                {fieldErrors.numero && <div className="field-error">{fieldErrors.numero}</div>}
              </div>
              <div className="field">
                <label htmlFor="complemento">Complemento</label>
                <input
                  id="complemento"
                  className="input"
                  placeholder="Apto 101 (opcional)"
                  value={form.complemento}
                  onChange={(e) => set('complemento', e.target.value)}
                />
              </div>
            </div>

            {form.tipo === 'apartamento' && (
              <div className="grid-3">
                <div className="field">
                  <label htmlFor="unidade">Apto/unidade</label>
                  <input id="unidade" className={`input ${fieldErrors.unidade ? 'error' : ''}`} placeholder="101" value={form.unidade} onChange={(e) => set('unidade', e.target.value)} />
                  {fieldErrors.unidade && <div className="field-error">{fieldErrors.unidade}</div>}
                </div>
                <div className="field">
                  <label htmlFor="andar">Andar</label>
                  <input id="andar" className={`input ${fieldErrors.andar ? 'error' : ''}`} placeholder="10" value={form.andar} onChange={(e) => set('andar', e.target.value)} />
                  {fieldErrors.andar && <div className="field-error">{fieldErrors.andar}</div>}
                </div>
                <div className="field">
                  <label htmlFor="bloco">Bloco/torre</label>
                  <input id="bloco" className="input" placeholder="Opcional" value={form.bloco} onChange={(e) => set('bloco', e.target.value)} />
                </div>
              </div>
            )}

            {form.tipo === 'comercial' && (
              <div className="field">
                <label htmlFor="unidade">Sala/unidade</label>
                <input id="unidade" className={`input ${fieldErrors.unidade ? 'error' : ''}`} placeholder="Ex.: Sala 302" value={form.unidade} onChange={(e) => set('unidade', e.target.value)} />
                {fieldErrors.unidade && <div className="field-error">{fieldErrors.unidade}</div>}
              </div>
            )}

            {form.tipo === 'casa' && (
              <div className="field">
                <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 400 }}>
                  <input type="checkbox" checked={emCondominio} onChange={(e) => setEmCondominio(e.target.checked)} style={{ width: 18, height: 18 }} />
                  <span>Casa em condomínio fechado</span>
                </label>
                {emCondominio && (
                  <input className="input" style={{ marginTop: '0.5rem' }} placeholder="Nome do condomínio" value={form.nome_condominio} onChange={(e) => set('nome_condominio', e.target.value)} />
                )}
              </div>
            )}

            <div className="grid-2">
              <div className="field">
                <label htmlFor="bairro">Bairro</label>
                <input
                  id="bairro"
                  className={`input ${fieldErrors.bairro ? 'error' : ''}`}
                  placeholder="Ex.: Pituba"
                  value={form.bairro}
                  onChange={(e) => set('bairro', e.target.value)}
                />
                {fieldErrors.bairro && <div className="field-error">{fieldErrors.bairro}</div>}
              </div>
              <div className="field">
                <label htmlFor="cidade">Cidade</label>
                <input
                  id="cidade"
                  className={`input ${fieldErrors.cidade ? 'error' : ''}`}
                  placeholder="Ex.: Salvador"
                  value={form.cidade}
                  onChange={(e) => set('cidade', e.target.value)}
                />
                {fieldErrors.cidade && <div className="field-error">{fieldErrors.cidade}</div>}
              </div>
            </div>
          </>
        )}

        {/* ETAPA 3 — Detalhes */}
        {step === 3 && (
          <>
            <h2 className="wizard-q">Detalhes do imóvel</h2>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="preco">Preço</label>
                <div className={`input-prefix ${fieldErrors.preco ? 'error' : ''}`}>
                  <span>R$</span>
                  <input
                    id="preco"
                    inputMode="numeric"
                    placeholder="450.000"
                    value={form.preco}
                    onChange={(e) => set('preco', formatMilhar(e.target.value))}
                  />
                </div>
                {fieldErrors.preco && <div className="field-error">{fieldErrors.preco}</div>}
              </div>
              <div className="field">
                <label htmlFor="area_m2">Metragem</label>
                <div className={`input-prefix input-suffix ${fieldErrors.area_m2 ? 'error' : ''}`}>
                  <input
                    id="area_m2"
                    inputMode="numeric"
                    placeholder="90"
                    value={form.area_m2}
                    onChange={(e) => set('area_m2', e.target.value.replace(/\D/g, ''))}
                  />
                  <span>m²</span>
                </div>
                {fieldErrors.area_m2 && <div className="field-error">{fieldErrors.area_m2}</div>}
              </div>
            </div>

            <div className="steppers">
              <Stepper label="Quartos" value={counts.quartos} onDelta={(d) => setCounts((c) => ({ ...c, quartos: Math.max(0, Math.min(50, c.quartos + d)) }))} />
              <Stepper label="Suítes" value={counts.suites} onDelta={(d) => setCounts((c) => ({ ...c, suites: Math.max(0, Math.min(50, c.suites + d)) }))} />
              <Stepper label="Banheiros" value={counts.banheiros} onDelta={(d) => setCounts((c) => ({ ...c, banheiros: Math.max(0, Math.min(50, c.banheiros + d)) }))} />
              <Stepper label="Vagas" value={counts.vagas} onDelta={(d) => setCounts((c) => ({ ...c, vagas: Math.max(0, Math.min(50, c.vagas + d)) }))} />
            </div>

            <div className="field" style={{ marginTop: '1.25rem' }}>
              <label>Diferenciais</label>
              <p className="muted" style={{ margin: '0 0 0.6rem', fontSize: '0.84rem' }}>
                Toque para adicionar (mín. 1).
              </p>
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
              {fieldErrors.diferenciais && <div className="field-error">{fieldErrors.diferenciais}</div>}
            </div>
          </>
        )}

        {/* ETAPA 4 — Fotos */}
        {step === 4 && (
          <>
            <h2 className="wizard-q">Fotos do imóvel</h2>
            <p className="muted" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.88rem' }}>
              Adicione pelo menos <strong>5 fotos</strong> para o imóvel aparecer na vitrine. A
              primeira é a capa.
            </p>
            <PhotoUploader value={fotos} onChange={setFotos} />
            {fotos.length > 0 && fotos.length < 5 && (
              <div className="field-hint" style={{ marginTop: '0.75rem' }}>
                {fotos.length}/5 fotos — faltam {5 - fotos.length} para entrar na vitrine.
              </div>
            )}
          </>
        )}

        {/* ETAPA 5 — Revisão */}
        {step === 5 && (
          <>
            <h2 className="wizard-q">Revise e publique</h2>

            <div className="field">
              <label htmlFor="descricao">Descrição</label>
              <textarea
                id="descricao"
                className="input"
                rows={4}
                placeholder="Destaque o que o imóvel tem de melhor…"
                value={form.descricao}
                onChange={(e) => set('descricao', e.target.value)}
              />
            </div>

            <div className="review">
              <div className="review-row"><span>Anúncio</span><b>{FINALIDADES.find((f) => f.value === form.finalidade)?.label} · {tipoLabel}</b></div>
              <div className="review-row"><span>Preço</span><b>{form.preco ? `R$ ${form.preco}` : '—'}</b></div>
              <div className="review-row"><span>Local</span><b>{form.bairro}, {form.cidade}</b></div>
              <div className="review-row"><span>Metragem</span><b>{form.area_m2 ? `${form.area_m2} m²` : '—'}</b></div>
              <div className="review-row"><span>Cômodos</span><b>{counts.quartos} qto · {counts.suites} suíte · {counts.banheiros} banh · {counts.vagas} vaga</b></div>
              <div className="review-row"><span>Diferenciais</span><b>{diferenciais.length || 0}</b></div>
              <div className="review-row"><span>Fotos</span><b>{fotos.length} {fotos.length < 5 ? '(mín. 5 p/ vitrine)' : ''}</b></div>
            </div>
          </>
        )}
      </div>

      <div className="wizard-footer">
        <button type="button" className="btn btn-ghost" onClick={voltar} disabled={loading}>
          {step === 1 ? 'Cancelar' : 'Voltar'}
        </button>
        {step < TOTAL_ETAPAS ? (
          <button type="button" className="btn btn-emerald" onClick={avancar}>
            Continuar
          </button>
        ) : (
          <button type="button" className="btn btn-emerald" onClick={() => publicar()} disabled={loading}>
            {loading ? 'Publicando…' : 'Publicar imóvel'}
          </button>
        )}
      </div>
    </div>
  );
}
