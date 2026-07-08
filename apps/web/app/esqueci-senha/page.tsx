'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { AuthShell } from '@/components/AuthShell';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/auth/senha/esqueci', { method: 'POST', body: { email } });
    } finally {
      // Resposta neutra: sempre confirma, exista o e-mail ou não.
      setEnviado(true);
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <form className="card" onSubmit={onSubmit}>
        <h2>Recuperar senha</h2>
        {enviado ? (
          <>
            <div className="banner banner-success">
              Se houver uma conta com este e-mail, enviamos as instruções para redefinir a senha.
            </div>
            <Link href="/login" className="btn btn-ghost" style={{ width: '100%' }}>
              Voltar para o login
            </Link>
          </>
        ) : (
          <>
            <p className="muted" style={{ marginBottom: '1rem' }}>
              Informe seu e-mail e enviaremos um link para redefinir a senha.
            </p>
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
            <button type="submit" className="btn btn-orange" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link'}
            </button>
            <p className="form-footer">
              <Link href="/login">Voltar para o login</Link>
            </p>
          </>
        )}
      </form>
    </AuthShell>
  );
}
