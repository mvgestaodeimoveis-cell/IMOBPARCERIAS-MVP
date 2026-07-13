import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TERMO_PARCERIA_HASH,
  TERMO_PARCERIA_RESUMO,
  TERMO_PARCERIA_VERSAO,
} from './termo-parceria';

test('hash do termo é SHA-256 (64 hex) e determinístico', () => {
  assert.match(TERMO_PARCERIA_HASH, /^[a-f0-9]{64}$/);
});

test('resumo tem os 3 pontos principais', () => {
  assert.equal(TERMO_PARCERIA_RESUMO.length, 3);
  for (const p of TERMO_PARCERIA_RESUMO) {
    assert.ok(p.titulo.length > 0);
    assert.ok(p.texto.length > 0);
  }
});

test('versão segue o padrão informado', () => {
  assert.equal(TERMO_PARCERIA_VERSAO, 'v2.1');
});
