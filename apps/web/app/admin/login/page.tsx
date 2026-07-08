'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import { Brandmark } from '@/components/Brandmark';

interface EquipeLoginResponse {
  access_token: string;
  refresh_token: string;
  equipe: { id: string; nome: string };
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      const res = await apiFetch<EquipeLoginResponse>('/auth/equipe/login', {
        method: 'POST',
        body: { email, senha },
      });
      saveSession({
        accessToken: res.access_token,
        refreshToken: res.refresh_token,
        role: 'equipe',
      });
      router.push('/admin/corretores');
    } catch (err) {
      setErro(err instanceof ApiRequestError ? err.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="frame">
      <header className="topbar">
        <span className="brand-link">
          <Brandmark />
        </span>
        <span className="muted" style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Equipe
        </span>
      </header>
      <div
        className="screen"
        style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
      >
        <form className="card" style={{ width: '100%', maxWidth: 420, margin: '0 auto' }} onSubmit={onSubmit}>
          <h2>Acesso da equipe</h2>
          <p className="muted" style={{ marginBottom: '1rem' }}>
            Área interna de verificação de CRECI.
          </p>
          {erro && <div className="banner banner-error">{erro}</div>}
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="equipe@imobparcerias.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              className="input"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-navy" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
