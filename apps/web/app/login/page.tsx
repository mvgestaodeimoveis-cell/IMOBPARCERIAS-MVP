'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { routeForStatus, saveSession } from '@/lib/auth';
import { AuthShell } from '@/components/AuthShell';
import { AuthTabs } from '@/components/AuthTabs';
import { GoogleButton } from '@/components/GoogleButton';
import { LogoMark } from '@/components/LogoMark';

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  corretor: { id: string; nome: string; status: string; papel: string };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
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

          <GoogleButton onClick={() => setInfo('Login com Google estará disponível em breve.')} />
          <div className="divider">ou</div>

          {erro && <div className="banner banner-error">{erro}</div>}
          {info && <div className="banner banner-info">{info}</div>}

          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type={showSenha ? 'text' : 'password'}
              className="input"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
              <button
                type="button"
                className="link-quiet"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onClick={() => setShowSenha((v) => !v)}
              >
                {showSenha ? 'Ocultar' : 'Mostrar'}
              </button>
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
