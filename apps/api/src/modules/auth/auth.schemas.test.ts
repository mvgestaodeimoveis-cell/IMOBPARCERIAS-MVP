import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registroSchema, completarCadastroSchema, loginSchema } from './auth.schemas';

test('registro normaliza e-mail para minúsculas', () => {
  const r = registroSchema.safeParse({ nome: 'Ana Souza', email: 'ANA@Ex.COM', senha: 'senha1234' });
  assert.equal(r.success, true);
  if (r.success) assert.equal(r.data.email, 'ana@ex.com');
});

test('senha exige 8+ com letra e número', () => {
  assert.equal(registroSchema.safeParse({ nome: 'Ana Souza', email: 'a@b.com', senha: 'curta1' }).success, false);
  assert.equal(registroSchema.safeParse({ nome: 'Ana Souza', email: 'a@b.com', senha: 'semnumeros' }).success, false);
  assert.equal(registroSchema.safeParse({ nome: 'Ana Souza', email: 'a@b.com', senha: 'senha1234' }).success, true);
});

test('completar cadastro normaliza WhatsApp para E.164', () => {
  const r = completarCadastroSchema.safeParse({
    whatsapp: '(71) 99999-8888',
    cidade: 'Salvador',
    creci: '12345',
    aceite_termo: true,
    versao_termo: '2026-07-13',
  });
  assert.equal(r.success, true);
  if (r.success) assert.equal(r.data.whatsapp, '+5571999998888');
});

test('completar cadastro exige aceite do termo', () => {
  const r = completarCadastroSchema.safeParse({
    whatsapp: '71999998888',
    cidade: 'Salvador',
    creci: '12345',
    aceite_termo: false,
    versao_termo: '2026-07-13',
  });
  assert.equal(r.success, false);
});

test('WhatsApp inválido é rejeitado', () => {
  const r = completarCadastroSchema.safeParse({
    whatsapp: '123',
    cidade: 'Salvador',
    creci: '12345',
    aceite_termo: true,
    versao_termo: '2026-07-13',
  });
  assert.equal(r.success, false);
});

test('login normaliza e-mail', () => {
  const r = loginSchema.safeParse({ email: 'X@Y.COM', senha: 'qualquer' });
  assert.equal(r.success, true);
  if (r.success) assert.equal(r.data.email, 'x@y.com');
});
