/** Validações no cliente — espelham as regras do servidor para feedback instantâneo. */

export function validateNome(v: string): string | null {
  const t = v.trim();
  if (!t) return 'Informe seu nome completo.';
  if (t.length < 3) return 'Informe seu nome completo.';
  return null;
}

export function validateEmail(v: string): string | null {
  const t = v.trim();
  if (!t) return 'Informe o e-mail.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return 'E-mail inválido.';
  return null;
}

export function validateSenha(v: string): string | null {
  if (!v) return 'Informe a senha.';
  if (v.length < 8 || !/[A-Za-z]/.test(v) || !/\d/.test(v)) {
    return 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
  }
  return null;
}

export function validateCreci(v: string): string | null {
  const t = v.replace(/\s+/g, '');
  if (!t) return 'Informe o CRECI.';
  if (t.length < 4) return 'CRECI inválido.';
  return null;
}

export function validateWhatsapp(v: string): string | null {
  const d = v.replace(/\D/g, '');
  if (!d) return 'Informe o WhatsApp.';
  if (d.length < 10 || d.length > 11) return 'Informe um WhatsApp válido com DDD.';
  return null;
}

export function validateCidade(v: string): string | null {
  if (!v) return 'Selecione sua cidade.';
  return null;
}
