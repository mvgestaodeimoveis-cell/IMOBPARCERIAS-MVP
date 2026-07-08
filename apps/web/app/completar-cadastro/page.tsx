'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { maskCreci, maskPhone } from '@/lib/masks';
import { validateCidade, validateCreci, validateWhatsapp } from '@/lib/validation';
import { clearSession, getAccessToken, routeForStatus } from '@/lib/auth';
import { AuthShell } from '@/components/AuthShell';

interface TermoResponse {
  versao: string;
  texto: string;
}

const CIDADES_BA = [
  'Salvador',
  'Lauro de Freitas',
  'Camaçari',
  'Mata de São João',
  'Dias D’Ávila',
  'Simões Filho',
];

export default function CompletarCadastroPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState('');
  const [termo, setTermo] = useState<TermoResponse | null>(null);
  const [form, setForm] = useState({
    whatsapp: '',
    cidade: '',
    creci: '',
    imobiliaria: '',
  });
  const [aceite, setAceite] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    apiFetch<{ nome: string; status: string }>('/corretores/me', { token })
      .then((me) => {
        if (me.status !== 'cadastro_incompleto') {
          router.replace(routeForStatus(me.status));
          return;
        }
        setNome(me.nome);
        setCarregando(false);
      })
      .catch(() => router.replace('/login'));

    apiFetch<TermoResponse>('/termo/atual')
      .then(setTermo)
      .catch(() => setTermo(null));
  }, [router]);

  const VALIDATORS: Record<string, (v: string) => string | null> = {
    whatsapp: validateWhatsapp,
    cidade: validateCidade,
    creci: validateCreci,
  };

  function setFieldError(key: string, err: string | null) {
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (err) next[key] = err;
      else delete next[key];
      return next;
    });
  }

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    const validator = VALIDATORS[key];
    if (validator && fieldErrors[key]) setFieldError(key, validator(value));
  }

  function validateField(key: string) {
    const validator = VALIDATORS[key];
    if (validator) setFieldError(key, validator(String(form[key as keyof typeof form])));
  }

  function validateAll(): boolean {
    const errs: Record<string, string> = {};
    const w = validateWhatsapp(form.whatsapp);
    if (w) errs.whatsapp = w;
    const ci = validateCidade(form.cidade);
    if (ci) errs.cidade = ci;
    const cr = validateCreci(form.creci);
    if (cr) errs.creci = cr;
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!validateAll()) return;
    if (!aceite) {
      setErro('É necessário aceitar o Termo de Uso.');
      return;
    }

    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/corretores/completar-cadastro', {
        method: 'POST',
        token,
        body: {
          whatsapp: form.whatsapp,
          cidade: form.cidade,
          creci: form.creci,
          imobiliaria: form.imobiliaria.trim() || undefined,
          aceite_termo: true,
          versao_termo: termo?.versao ?? 'preliminar',
        },
      });
      router.push('/perfil/analise');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErro(err.message);
        if (err.fields) setFieldErrors(err.fields);
      } else {
        setErro('Não foi possível concluir o cadastro.');
      }
    } finally {
      setLoading(false);
    }
  }

  function sair() {
    clearSession();
    router.replace('/login');
  }

  if (carregando) {
    return (
      <AuthShell>
        <div className="card">
          <p className="muted" style={{ textAlign: 'center' }}>
            Carregando...
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form className="card" onSubmit={onSubmit}>
        <div style={{ display: 'flex', gap: 6, marginBottom: '0.5rem' }}>
          <span style={{ flex: 1, height: 4, borderRadius: 4, background: 'var(--emerald)' }} />
          <span style={{ flex: 1, height: 4, borderRadius: 4, background: 'var(--emerald)' }} />
        </div>
        <p className="muted" style={{ fontSize: '0.82rem', marginBottom: '0.4rem' }}>
          Etapa 2 de 2 — dados profissionais
        </p>
        <h2 style={{ margin: '0 0 0.25rem' }}>
          Quase lá{nome ? `, ${nome.split(' ')[0]}` : ''}!
        </h2>
        <p className="muted" style={{ marginBottom: '1.1rem' }}>
          Complete seus dados para enviarmos seu CRECI para verificação.
        </p>

        {erro && <div className="banner banner-error">{erro}</div>}

        <div className="field">
          <label htmlFor="whatsapp">Telefone / WhatsApp</label>
          <input
            id="whatsapp"
            placeholder="(71) 99999-9999"
            inputMode="tel"
            maxLength={15}
            className={`input ${fieldErrors.whatsapp ? 'error' : ''}`}
            value={form.whatsapp}
            onChange={(e) => update('whatsapp', maskPhone(e.target.value))}
            onBlur={() => validateField('whatsapp')}
          />
          {fieldErrors.whatsapp && <div className="field-error">{fieldErrors.whatsapp}</div>}
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="cidade">Cidade</label>
            <select
              id="cidade"
              className={`input ${fieldErrors.cidade ? 'error' : ''}`}
              value={form.cidade}
              onChange={(e) => update('cidade', e.target.value)}
              onBlur={() => validateField('cidade')}
            >
              <option value="" disabled>
                Selecione
              </option>
              {CIDADES_BA.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {fieldErrors.cidade && <div className="field-error">{fieldErrors.cidade}</div>}
          </div>
          <div className="field">
            <label htmlFor="creci">CRECI</label>
            <input
              id="creci"
              className={`input ${fieldErrors.creci ? 'error' : ''}`}
              placeholder="12345-F"
              value={form.creci}
              onChange={(e) => update('creci', maskCreci(e.target.value))}
              onBlur={() => validateField('creci')}
            />
            {fieldErrors.creci && <div className="field-error">{fieldErrors.creci}</div>}
          </div>
        </div>

        <div className="field">
          <label htmlFor="imobiliaria">
            Imobiliária <span className="muted">(opcional)</span>
          </label>
          <input
            id="imobiliaria"
            className="input"
            placeholder="Nome da imobiliária"
            maxLength={120}
            value={form.imobiliaria}
            onChange={(e) => update('imobiliaria', e.target.value)}
          />
        </div>

        <div className="field">
          <label
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontWeight: 400 }}
          >
            <input
              type="checkbox"
              checked={aceite}
              onChange={(e) => setAceite(e.target.checked)}
              style={{ marginTop: '0.2rem', width: 18, height: 18, flexShrink: 0 }}
            />
            <span className="muted">
              Li e aceito o{' '}
              <Link href="/termo" target="_blank">
                Termo de Uso
              </Link>
              {termo?.versao ? ` (versão ${termo.versao})` : ''}.
            </span>
          </label>
        </div>

        <button type="submit" className="btn btn-orange" disabled={loading || !aceite}>
          {loading ? 'Enviando...' : 'Concluir cadastro'}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ marginTop: '0.75rem' }}
          onClick={sair}
        >
          Sair
        </button>
      </form>
    </AuthShell>
  );
}
