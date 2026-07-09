'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { AuthShell } from '@/components/AuthShell';

type Estado = 'carregando' | 'sucesso' | 'erro';

function ConfirmarEmail() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [estado, setEstado] = useState<Estado>('carregando');
  const [mensagem, setMensagem] = useState('');
  const jaChamou = useRef(false);

  useEffect(() => {
    if (jaChamou.current) return;
    jaChamou.current = true;

    if (!token) {
      setEstado('erro');
      setMensagem('Link inválido. Verifique se você abriu o link completo do e-mail.');
      return;
    }

    apiFetch('/auth/confirmar-email', { method: 'POST', body: { token } })
      .then(() => setEstado('sucesso'))
      .catch((err) => {
        setEstado('erro');
        setMensagem(
          err instanceof ApiRequestError
            ? err.message
            : 'Não foi possível confirmar o seu e-mail.',
        );
      });
  }, [token]);

  return (
    <AuthShell>
      <div className="card" style={{ textAlign: 'center' }}>
        {estado === 'carregando' && (
          <>
            <h1 style={{ margin: '0 0 0.5rem' }}>Confirmando seu e-mail…</h1>
            <p className="muted">Um instante, estamos validando o seu link.</p>
          </>
        )}

        {estado === 'sucesso' && (
          <>
            <div
              aria-hidden
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--emerald)',
                color: '#fff',
                fontSize: 34,
                lineHeight: '64px',
                margin: '0 auto 1rem',
              }}
            >
              ✓
            </div>
            <h1 style={{ margin: '0 0 0.5rem' }}>E-mail confirmado!</h1>
            <p className="muted" style={{ marginBottom: '1.25rem' }}>
              Tudo certo. Agora é só acessar sua conta e completar o cadastro.
            </p>
            <Link href="/login" className="btn btn-orange" style={{ textDecoration: 'none' }}>
              Acessar minha conta
            </Link>
          </>
        )}

        {estado === 'erro' && (
          <>
            <h1 style={{ margin: '0 0 0.5rem' }}>Link inválido</h1>
            <p className="muted" style={{ marginBottom: '1.25rem' }}>
              {mensagem}
            </p>
            <Link href="/login" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              Ir para o login
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}

export default function ConfirmarEmailPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmarEmail />
    </Suspense>
  );
}
