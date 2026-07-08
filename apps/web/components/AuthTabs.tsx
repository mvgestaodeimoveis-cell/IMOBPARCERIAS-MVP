import Link from 'next/link';

export function AuthTabs({ active }: { active: 'entrar' | 'cadastrar' }) {
  return (
    <div className="segment">
      <Link href="/login" className={active === 'entrar' ? 'active' : ''}>
        Entrar
      </Link>
      <Link href="/cadastro" className={active === 'cadastrar' ? 'active' : ''}>
        Cadastrar
      </Link>
    </div>
  );
}
