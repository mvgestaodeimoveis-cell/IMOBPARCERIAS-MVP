'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { getAccessToken, getRole } from '@/lib/auth';

interface AdminRow {
  id: string;
  nome: string;
  email: string;
  criado_em: string;
}

interface ListResponse {
  data: AdminRow[];
}

export default function AdminEquipePage() {
  const router = useRouter();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState({ nome: '', email: '', senha: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const token = getAccessToken();
    if (!token || getRole() !== 'equipe') {
      router.replace('/admin/login');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<ListResponse>('/admin/equipe', { token });
      setRows(res.data);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'UNAUTHENTICATED') {
        router.replace('/admin/login');
        return;
      }
      setErro('Não foi possível carregar a equipe.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function update(campo: keyof typeof form, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setFieldErrors((e) => ({ ...e, [campo]: '' }));
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    setFieldErrors({});
    setSalvando(true);
    const token = getAccessToken();
    try {
      const novo = await apiFetch<AdminRow>('/admin/equipe', {
        method: 'POST',
        token,
        body: form,
      });
      setRows((r) => [...r, novo]);
      setForm({ nome: '', email: '', senha: '' });
      setSucesso('Administrador cadastrado com sucesso.');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.fields) setFieldErrors(err.fields);
        else setErro(err.message);
      } else {
        setErro('Erro ao cadastrar administrador.');
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <h1 style={{ fontSize: '1.5rem' }}>Administradores</h1>
      <p className="muted" style={{ marginBottom: '1.25rem' }}>Equipe com acesso ao painel.</p>

        <form className="card" onSubmit={criar} style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginTop: 0 }}>Novo administrador</h2>
          {erro && <div className="banner banner-error">{erro}</div>}
          {sucesso && <div className="banner banner-success">{sucesso}</div>}

          <div className="field">
            <label htmlFor="nome">Nome</label>
            <input
              id="nome"
              type="text"
              value={form.nome}
              onChange={(e) => update('nome', e.target.value)}
              autoComplete="name"
            />
            {fieldErrors.nome && <span className="field-error">{fieldErrors.nome}</span>}
          </div>

          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              autoComplete="email"
            />
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </div>

          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              value={form.senha}
              onChange={(e) => update('senha', e.target.value)}
              autoComplete="new-password"
            />
            {fieldErrors.senha && <span className="field-error">{fieldErrors.senha}</span>}
          </div>

          <button className="btn btn-emerald" type="submit" disabled={salvando}>
            {salvando ? 'Cadastrando...' : 'Cadastrar administrador'}
          </button>
        </form>

        {loading ? (
          <p className="muted">Carregando...</p>
        ) : rows.length === 0 ? (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>Nenhum administrador cadastrado.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Desde</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>{a.nome}</td>
                  <td>{a.email}</td>
                  <td>{new Date(a.criado_em).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </>
  );
}
