import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularComissaoTaxa } from './comissao';

test('comissão 5% e taxa 10% da comissão (exemplo do escopo)', () => {
  const { comissao, taxa } = calcularComissaoTaxa(500000);
  assert.equal(comissao, 25000);
  assert.equal(taxa, 2500);
});

test('arredonda para 2 casas decimais', () => {
  const { comissao, taxa } = calcularComissaoTaxa(333333);
  assert.equal(comissao, 16666.65);
  assert.equal(taxa, 1666.67);
});

test('valor zero resulta em zero', () => {
  const { comissao, taxa } = calcularComissaoTaxa(0);
  assert.equal(comissao, 0);
  assert.equal(taxa, 0);
});
