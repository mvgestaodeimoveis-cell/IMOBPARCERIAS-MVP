'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { maskCep } from '@/lib/masks';
import { getAccessToken } from '@/lib/auth';
import { Brandmark } from '@/components/Brandmark';
import { PhotoUploader } from '@/components/PhotoUploader';

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

type Finalidade = 'venda' | 'aluguel';
type Tipo = 'apartamento' | 'casa' | 'terreno' | 'comercial';

const numero = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const inteiro = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

export default function NovoImovelPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    finalidade: 'venda' as Finalidade,
    tipo: 'apartamento' as Tipo,
    preco: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    area_m2: '',
    quartos: '',
    suites: '',
    banheiros: '',
    vagas: '',
    descricao: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fotos, setFotos] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [importUrl, setImportUrl] = useState('');
  const [importando, setImportando] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [linkOrigem, setLinkOrigem] = useState<string | null>(null);

  const str = (v: number | undefined) => (v == null ? '' : String(v));

  async function importar() {
    if (!importUrl.trim()) return;
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setImportMsg(null);
    setErro(null);
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
        preco: d.preco != null ? String(d.preco) : f.preco,
        cep: d.cep ? maskCep(d.cep) : f.cep,
        logradouro: d.logradouro ?? f.logradouro,
        numero: d.numero ?? f.numero,
        bairro: d.bairro ?? f.bairro,
        cidade: d.cidade ?? f.cidade,
        area_m2: str(d.area_m2) || f.area_m2,
        quartos: str(d.quartos) || f.quartos,
        banheiros: str(d.banheiros) || f.banheiros,
        vagas: str(d.vagas) || f.vagas,
        descricao: d.descricao ?? d.titulo ?? f.descricao,
      }));
      if (d.fotos && d.fotos.length > 0) setFotos((atuais) => [...atuais, ...d.fotos].slice(0, 10));
      setLinkOrigem(importUrl.trim());
      setImportMsg('Dados importados. Revise e complete antes de cadastrar.');
    } catch (err) {
      setImportMsg(
        err instanceof ApiRequestError ? err.message : 'Não foi possível importar deste link.',
      );
    } finally {
      setImportando(false);
    }
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setFieldErrors({});

    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const payload = {
      finalidade: form.finalidade,
      tipo: form.tipo,
      preco: numero(form.preco) ?? 0,
      cep: form.cep,
      logradouro: form.logradouro,
      numero: form.numero,
      complemento: form.complemento || undefined,
      bairro: form.bairro,
      cidade: form.cidade,
      area_m2: numero(form.area_m2),
      quartos: inteiro(form.quartos),
      suites: inteiro(form.suites),
      banheiros: inteiro(form.banheiros),
      vagas: inteiro(form.vagas),
      descricao: form.descricao || undefined,
      fotos,
      link_origem: linkOrigem ?? undefined,
    };

    setLoading(true);
    try {
      await apiFetch('/imoveis', { method: 'POST', token, body: payload });
      router.push('/painel?imovel=ok');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErro(err.message);
        if (err.fields) setFieldErrors(err.fields);
      } else {
        setErro('Não foi possível cadastrar o imóvel.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="frame frame-app">
      <header className="topbar">
        <Brandmark />
        <Link href="/painel" className="auth-back">
          <span aria-hidden>←</span> Voltar
        </Link>
      </header>

      <div className="screen">
        <h1 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>Cadastrar imóvel</h1>
        <p className="muted" style={{ marginBottom: '1.25rem' }}>
          O imóvel entra na sua carteira com exclusividade verificada.
        </p>

        {erro && <div className="banner banner-error">{erro}</div>}

        <div className="card import-box">
          <h3 className="import-title">Importar de um link</h3>
          <p className="muted" style={{ margin: '0 0 0.75rem', fontSize: '0.88rem' }}>
            Cole o link do anúncio (OLX, VivaReal, ZAP, site próprio…). Tentamos preencher os dados
            automaticamente para você revisar.
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

        <form className="card" onSubmit={onSubmit}>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="finalidade">Finalidade</label>
              <select
                id="finalidade"
                className="input"
                value={form.finalidade}
                onChange={(e) => set('finalidade', e.target.value as Finalidade)}
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
                value={form.tipo}
                onChange={(e) => set('tipo', e.target.value as Tipo)}
              >
                <option value="apartamento">Apartamento</option>
                <option value="casa">Casa</option>
                <option value="terreno">Terreno</option>
                <option value="comercial">Comercial</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="preco">Preço (R$)</label>
            <input
              id="preco"
              className={`input ${fieldErrors.preco ? 'error' : ''}`}
              inputMode="decimal"
              placeholder="Ex.: 450000"
              value={form.preco}
              onChange={(e) => set('preco', e.target.value.replace(/[^\d.,]/g, ''))}
            />
            {fieldErrors.preco && <div className="field-error">{fieldErrors.preco}</div>}
          </div>

          <div className="grid-2">
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
              />
              {fieldErrors.cep && <div className="field-error">{fieldErrors.cep}</div>}
            </div>
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
              <label htmlFor="complemento">Complemento</label>
              <input
                id="complemento"
                className="input"
                placeholder="Apto 101, bloco B (opcional)"
                value={form.complemento}
                onChange={(e) => set('complemento', e.target.value)}
              />
            </div>
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

          <div className="grid-2">
            <div className="field">
              <label htmlFor="area_m2">Área (m²)</label>
              <input
                id="area_m2"
                className="input"
                inputMode="decimal"
                placeholder="Opcional"
                value={form.area_m2}
                onChange={(e) => set('area_m2', e.target.value.replace(/[^\d.,]/g, ''))}
              />
            </div>
            <div className="field">
              <label htmlFor="vagas">Vagas</label>
              <input
                id="vagas"
                className="input"
                inputMode="numeric"
                placeholder="Opcional"
                value={form.vagas}
                onChange={(e) => set('vagas', e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          <div className="grid-3">
            <div className="field">
              <label htmlFor="quartos">Quartos</label>
              <input
                id="quartos"
                className="input"
                inputMode="numeric"
                placeholder="0"
                value={form.quartos}
                onChange={(e) => set('quartos', e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="field">
              <label htmlFor="suites">Suítes</label>
              <input
                id="suites"
                className="input"
                inputMode="numeric"
                placeholder="0"
                value={form.suites}
                onChange={(e) => set('suites', e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="field">
              <label htmlFor="banheiros">Banheiros</label>
              <input
                id="banheiros"
                className="input"
                inputMode="numeric"
                placeholder="0"
                value={form.banheiros}
                onChange={(e) => set('banheiros', e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="descricao">Descrição</label>
            <textarea
              id="descricao"
              className="input"
              rows={4}
              placeholder="Detalhes do imóvel, diferenciais, condições…"
              value={form.descricao}
              onChange={(e) => set('descricao', e.target.value)}
            />
          </div>

          <div className="field">
            <label>Fotos</label>
            <PhotoUploader value={fotos} onChange={setFotos} />
          </div>

          <button type="submit" className="btn btn-emerald" disabled={loading}>
            {loading ? 'Salvando…' : 'Cadastrar imóvel'}
          </button>
        </form>
      </div>
    </div>
  );
}
