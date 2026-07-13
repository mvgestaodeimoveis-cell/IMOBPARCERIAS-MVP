'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { validateEmail, validateNome, validateSenha } from '@/lib/validation';
import { saveSession } from '@/lib/auth';
import { googleLoginEnabled, startGoogleLogin } from '@/lib/googleLogin';
import { AuthShell } from '@/components/AuthShell';
import { AuthTabs } from '@/components/AuthTabs';
import { GoogleButton } from '@/components/GoogleButton';
import { PasswordInput } from '@/components/PasswordInput';

interface RegistroResponse {
  access_token: string;
  refresh_token: string;
  corretor: { id: string; nome: string; email: string; status: string; papel: string };
}

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmarSenha: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const VALIDATORS: Record<string, (v: string) => string | null> = {
    nome: validateNome,
    email: validateEmail,
    senha: validateSenha,
  };

  function validateConfirmar(v = form.confirmarSenha): string | null {
    if (!v) return 'Confirme a senha.';
    if (v !== form.senha) return 'As senhas não conferem.';
    return null;
  }

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
    const n = validateNome(form.nome);
    if (n) errs.nome = n;
    const em = validateEmail(form.email);
    if (em) errs.email = em;
    const s = validateSenha(form.senha);
    if (s) errs.senha = s;
    const c = validateConfirmar();
    if (c) errs.confirmarSenha = c;
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!validateAll()) return;

    setLoading(true);
    try {
      const res = await apiFetch<RegistroResponse>('/auth/registro', {
        method: 'POST',
        body: { nome: form.nome, email: form.email, senha: form.senha },
      });
      saveSession({
        accessToken: res.access_token,
        refreshToken: res.refresh_token,
        role: 'corretor',
      });
      router.push('/completar-cadastro');
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

        <div style={{ display: 'flex', gap: 6, marginBottom: '0.5rem' }}>
          <span style={{ flex: 1, height: 4, borderRadius: 4, background: 'var(--emerald)' }} />
          <span style={{ flex: 1, height: 4, borderRadius: 4, background: 'var(--border)' }} />
        </div>
        <p className="muted" style={{ fontSize: '0.82rem', marginBottom: '1.1rem' }}>
          Etapa 1 de 2 — crie sua conta
        </p>

        {erro && <div className="banner banner-error">{erro}</div>}
        {info && <div className="banner banner-info">{info}</div>}

        <GoogleButton
          onClick={() =>
            googleLoginEnabled
              ? startGoogleLogin('cadastro')
              : setInfo('Cadastro com Google estará disponível em breve.')
          }
        />
        <div className="divider">ou</div>

        <div className="field">
          <label htmlFor="nome">Nome completo</label>
          <input
            id="nome"
            className={`input ${fieldErrors.nome ? 'error' : ''}`}
            placeholder="Seu nome"
            value={form.nome}
            onChange={(e) => update('nome', e.target.value)}
            onBlur={() => validateField('nome')}
          />
          {fieldErrors.nome && <div className="field-error">{fieldErrors.nome}</div>}
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
            onBlur={() => validateField('email')}
          />
          {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
        </div>

        <div className="field">
          <label htmlFor="senha">Senha</label>
          <PasswordInput
            id="senha"
            placeholder="Mín. 8 caracteres"
            autoComplete="new-password"
            hasError={!!fieldErrors.senha}
            value={form.senha}
            onChange={(e) => update('senha', e.target.value)}
            onBlur={() => validateField('senha')}
          />
          {fieldErrors.senha && <div className="field-error">{fieldErrors.senha}</div>}
        </div>

        <div className="field">
          <label htmlFor="confirmarSenha">Confirmar senha</label>
          <PasswordInput
            id="confirmarSenha"
            placeholder="Repita a senha"
            autoComplete="new-password"
            hasError={!!fieldErrors.confirmarSenha}
            value={form.confirmarSenha}
            onChange={(e) => {
              setForm((f) => ({ ...f, confirmarSenha: e.target.value }));
              if (fieldErrors.confirmarSenha)
                setFieldError('confirmarSenha', validateConfirmar(e.target.value));
            }}
            onBlur={(e) => setFieldError('confirmarSenha', validateConfirmar(e.target.value))}
          />
          {fieldErrors.confirmarSenha && (
            <div className="field-error">{fieldErrors.confirmarSenha}</div>
          )}
        </div>

        <button type="submit" className="btn btn-orange" disabled={loading}>
          {loading ? 'Salvando...' : 'Continuar'}
        </button>
        <p className="form-footer">
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      </form>
    </AuthShell>
  );
}
