'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { validateSenha } from '@/lib/validation';
import { AuthShell } from '@/components/AuthShell';
import { PasswordInput } from '@/components/PasswordInput';

function RedefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [senhaErro, setSenhaErro] = useState<string | null>(null);
  const [fieldErro, setFieldErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setFieldErro(null);

    if (!token) {
      setErro('Link inválido. Solicite uma nova recuperação de senha.');
      return;
    }
    const sErr = validateSenha(senha);
    if (sErr) {
      setSenhaErro(sErr);
      return;
    }
    if (senha !== confirmar) {
      setFieldErro('As senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/auth/senha/redefinir', { method: 'POST', body: { token, senha } });
      setOk(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErro(err.message);
        if (err.fields?.senha) setFieldErro(err.fields.senha);
      } else {
        setErro('Não foi possível redefinir a senha.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (ok) {
    return (
      <div className="card">
        <h2>Senha redefinida</h2>
        <div className="banner banner-success">
          Sua senha foi alterada. Redirecionando para o login...
        </div>
        <Link href="/login" className="btn btn-ghost" style={{ width: '100%' }}>
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h2>Definir nova senha</h2>
      {erro && <div className="banner banner-error">{erro}</div>}
      {!token && (
        <div className="banner banner-warning">
          Link sem token. Use o link enviado por e-mail ou solicite um novo.
        </div>
      )}

      <div className="field">
        <label htmlFor="senha">Nova senha</label>
        <PasswordInput
          id="senha"
          placeholder="Mín. 8 caracteres"
          autoComplete="new-password"
          hasError={!!senhaErro}
          value={senha}
          onChange={(e) => {
            setSenha(e.target.value);
            if (senhaErro) setSenhaErro(validateSenha(e.target.value));
          }}
          onBlur={() => setSenhaErro(validateSenha(senha))}
          required
        />
        {senhaErro && <div className="field-error">{senhaErro}</div>}
      </div>

      <div className="field">
        <label htmlFor="confirmar">Confirmar nova senha</label>
        <PasswordInput
          id="confirmar"
          placeholder="Repita a senha"
          autoComplete="new-password"
          hasError={!!fieldErro}
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          required
        />
        {fieldErro && <div className="field-error">{fieldErro}</div>}
      </div>

      <button type="submit" className="btn btn-orange" disabled={loading}>
        {loading ? 'Salvando...' : 'Redefinir senha'}
      </button>
    </form>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="card">Carregando...</div>}>
        <RedefinirSenhaForm />
      </Suspense>
    </AuthShell>
  );
}
