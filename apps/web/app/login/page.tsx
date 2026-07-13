'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { routeForStatus, saveSession } from '@/lib/auth';
import { googleLoginEnabled, startGoogleLogin } from '@/lib/googleLogin';
import { validateEmail } from '@/lib/validation';
import { AuthShell } from '@/components/AuthShell';
import { AuthTabs } from '@/components/AuthTabs';
import { GoogleButton } from '@/components/GoogleButton';
import { LogoMark } from '@/components/LogoMark';
import { PasswordInput } from '@/components/PasswordInput';

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  corretor: { id: string; nome: string; status: string; papel: string };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; senha?: string }>({});
  const [loading, setLoading] = useState(false);

  function setFieldError(name: 'email' | 'senha', err: string | null) {
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (err) next[name] = err;
      else delete next[name];
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const emailErr = validateEmail(email);
    const senhaErr = senha ? null : 'Informe a senha.';
    if (emailErr || senhaErr) {
      setFieldErrors({ ...(emailErr ? { email: emailErr } : {}), ...(senhaErr ? { senha: senhaErr } : {}) });
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { email, senha },
      });
      saveSession({
        accessToken: res.access_token,
        refreshToken: res.refresh_token,
        role: 'corretor',
      });
      router.push(routeForStatus(res.corretor.status));
    } catch (err) {
      setErro(
        err instanceof ApiRequestError ? err.message : 'Não foi possível entrar. Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <form className="card" onSubmit={onSubmit}>
        <div className="center auth-card-brand" style={{ marginBottom: '1.25rem' }}>
          <LogoMark size={48} className="logo-hero" />
          <div className="brandmark" style={{ justifyContent: 'center' }}>
            <span>
              Imob<span className="accent">Parcerias</span>
            </span>
          </div>
          <p className="muted" style={{ marginTop: '0.35rem' }}>
            Rede exclusiva de corretores com CRECI verificado
          </p>
        </div>

        <AuthTabs active="entrar" />

        <GoogleButton
          onClick={() =>
            googleLoginEnabled
              ? startGoogleLogin('login')
              : setInfo('Login com Google estará disponível em breve.')
          }
        />
        <div className="divider">ou</div>

        {erro && <div className="banner banner-error">{erro}</div>}
        {info && <div className="banner banner-info">{info}</div>}

        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            className={`input ${fieldErrors.email ? 'error' : ''}`}
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldError('email', validateEmail(e.target.value));
            }}
            onBlur={() => setFieldError('email', validateEmail(email))}
            required
          />
          {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
        </div>

        <div className="field">
          <label htmlFor="senha">Senha</label>
          <PasswordInput
            id="senha"
            placeholder="Sua senha"
            autoComplete="current-password"
            hasError={!!fieldErrors.senha}
            value={senha}
            onChange={(e) => {
              setSenha(e.target.value);
              if (fieldErrors.senha) setFieldError('senha', e.target.value ? null : 'Informe a senha.');
            }}
            onBlur={() => setFieldError('senha', senha ? null : 'Informe a senha.')}
            required
          />
          {fieldErrors.senha && <div className="field-error">{fieldErrors.senha}</div>}
          <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
            <Link href="/esqueci-senha" className="link-quiet">
              Esqueci minha senha
            </Link>
          </div>
        </div>

        <button type="submit" className="btn btn-orange" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </AuthShell>
  );
}
