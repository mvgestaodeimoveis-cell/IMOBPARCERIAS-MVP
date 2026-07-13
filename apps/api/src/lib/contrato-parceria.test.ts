import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarContratoParceria, type ContratoDados } from './contrato-parceria';

const base: ContratoDados = {
  captadorNome: 'Ana Captadora',
  captadorCreci: 'BA-1111',
  compradorNome: 'Bruno Comprador',
  compradorCreci: 'BA-2222',
  clienteNome: 'Carlos Cliente',
  imovelTipo: 'apartamento',
  imovelBairro: 'Pituba',
  imovelCidade: 'Salvador',
  imovelPreco: 500000,
  janelaDias: 180,
  status: 'aceita',
  criadoEm: '2026-07-13T12:00:00Z',
};

test('contrato inclui partes, comissão e janela de 180 dias', () => {
  const texto = gerarContratoParceria(base);
  assert.match(texto, /Ana Captadora/);
  assert.match(texto, /Bruno Comprador/);
  assert.match(texto, /Carlos Cliente/);
  assert.match(texto, /10%/);
  assert.match(texto, /180 dias/);
});

test('contrato não expõe número de CPF nem endereço completo', () => {
  const texto = gerarContratoParceria(base);
  // Não deve conter um número de CPF (a palavra "CPF" aparece só ao descrever o processo).
  assert.doesNotMatch(texto, /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
  assert.doesNotMatch(texto, /logradouro/i);
});
