'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { AuthShell } from '@/components/AuthShell';
import { AuthTabs } from '@/components/AuthTabs';
import { GoogleButton } from '@/components/GoogleButton';

type Papel = 'captador' | 'comprador' | 'ambos';

interface TermoResponse {
  versao: string;
  texto: string;
}

const CIDADES_BA = [
  'Salvador',
  'Feira de Santana',
  'Camaçari',
  'Vitória da Conquista',
  'Itabuna',
  'Lauro de Freitas',
  'Ilhéus',
  'Juazeiro',
  'Outra',
];

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    creci: '',
    whatsapp: '',
    cidade: '',
    papel: 'captador' as Papel,
  });
  const [aceite, setAceite] = useState(false);
  const [termo, setTermo] = useState<TermoResponse | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<TermoResponse>('/termo/atual')
      .then(setTermo)
      .catch(() => setTermo(null));
  }, []);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setFieldErrors({});

    if (!aceite) {
      setErro('É necessário aceitar o Termo de Uso.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/auth/registro', {
        method: 'POST',
        body: {
          nome: form.nome,
          email: form.email,
          senha: form.senha,
          creci: form.creci,
          whatsapp: form.whatsapp,
          cidade: form.cidade,
          papel: form.papel,
          aceite_termo: true,
          versao_termo: termo?.versao ?? 'preliminar',
        },
      });
      router.push('/login?cadastro=ok');
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

  return (
    <AuthShell>
      <form className="card" onSubmit={onSubmit}>
        <AuthTabs active="cadastrar" />

          <GoogleButton onClick={() => setInfo('Cadastro com Google estará disponível em breve.')} />
          <div className="divider">ou</div>

          {erro && <div className="banner banner-error">{erro}</div>}
          {info && <div className="banner banner-info">{info}</div>}

          <div className="field">
            <label htmlFor="nome">Nome completo</label>
            <input
              id="nome"
              className={`input ${fieldErrors.nome ? 'error' : ''}`}
              placeholder="Seu nome"
              value={form.nome}
              onChange={(e) => update('nome', e.target.value)}
              required
            />
            {fieldErrors.nome && <div className="field-error">{fieldErrors.nome}</div>}
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="creci">CRECI</label>
              <input
                id="creci"
                className={`input ${fieldErrors.creci ? 'error' : ''}`}
                placeholder="12345-F"
                value={form.creci}
                onChange={(e) => update('creci', e.target.value)}
                required
              />
              {fieldErrors.creci && <div className="field-error">{fieldErrors.creci}</div>}
            </div>
            <div className="field">
              <label htmlFor="cidade">Cidade</label>
              <select
                id="cidade"
                className={`input ${fieldErrors.cidade ? 'error' : ''}`}
                value={form.cidade}
                onChange={(e) => update('cidade', e.target.value)}
                required
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
            </div>
          </div>

          <div className="field">
            <label htmlFor="whatsapp">Telefone / WhatsApp</label>
            <input
              id="whatsapp"
              placeholder="(71) 99999-9999"
              className={`input ${fieldErrors.whatsapp ? 'error' : ''}`}
              value={form.whatsapp}
              onChange={(e) => update('whatsapp', e.target.value)}
              required
            />
            {fieldErrors.whatsapp && <div className="field-error">{fieldErrors.whatsapp}</div>}
          </div>

          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              className={`input ${fieldErrors.email ? 'error' : ''}`}
              placeholder="voce@email.com"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
            />
            {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
          </div>

          <div className="field">
            <label htmlFor="papel">Como você atua?</label>
            <select
              id="papel"
              className="input"
              value={form.papel}
              onChange={(e) => update('papel', e.target.value as Papel)}
            >
              <option value="captador">Tenho imóveis (captador)</option>
              <option value="comprador">Tenho clientes compradores</option>
              <option value="ambos">Os dois</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              className={`input ${fieldErrors.senha ? 'error' : ''}`}
              placeholder="Mín. 8 caracteres"
              value={form.senha}
              onChange={(e) => update('senha', e.target.value)}
              required
            />
            {fieldErrors.senha && <div className="field-error">{fieldErrors.senha}</div>}
          </div>

          <div className="field">
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontWeight: 400 }}>
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
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>
    </AuthShell>
  );
}
