import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chaveDedupe, baseEndereco, isCepGeral } from './dedupe';

type Campos = Parameters<typeof chaveDedupe>[0];

const casa = (over: Partial<Campos> = {}): Campos => ({
  tipo: 'casa',
  cep: '41820-000',
  cidade: 'Salvador',
  bairro: 'Pituba',
  logradouro: 'Rua das Flores',
  numero: '100',
  unidade: null,
  andar: null,
  bloco: null,
  nome_condominio: null,
  area_m2: null,
  ...over,
});

test('isCepGeral: CEP terminado em 000 é geral; CEP de rua não é', () => {
  assert.equal(isCepGeral('40000-000'), true);
  assert.equal(isCepGeral('44700000'), true);
  assert.equal(isCepGeral('41820-450'), false);
  assert.equal(isCepGeral(''), false);
  assert.equal(isCepGeral('123'), false);
});

test('CEP geral: mesma rua/número em bairros diferentes NÃO colidem (falso positivo corrigido)', () => {
  const a = chaveDedupe(casa({ cep: '40000-000', bairro: 'Centro' }));
  const b = chaveDedupe(casa({ cep: '40000-000', bairro: 'Brotas' }));
  assert.notEqual(a, b);
});

test('CEP geral: ruas diferentes com o mesmo número NÃO colidem', () => {
  const a = chaveDedupe(casa({ cep: '40000-000', logradouro: 'Rua A' }));
  const b = chaveDedupe(casa({ cep: '40000-000', logradouro: 'Rua B' }));
  assert.notEqual(a, b);
});

test('CEP geral: mesmo endereço completo AINDA colide (duplicata real)', () => {
  const a = chaveDedupe(casa({ cep: '40000-000' }));
  const b = chaveDedupe(casa({ cep: '40000-000', logradouro: '  RUA DAS FLORES  ' }));
  assert.equal(a, b);
});

test('CEP de rua: continua ancorado no CEP + número', () => {
  const base = baseEndereco(casa({ cep: '41820-450' }));
  assert.equal(base, '41820450|100');
});

test('CEP de rua: mesmo CEP + número colide (duplicata real mantida)', () => {
  const a = chaveDedupe(casa({ cep: '41820-450' }));
  const b = chaveDedupe(casa({ cep: '41820-450', bairro: 'Outro' }));
  assert.equal(a, b);
});

test('terreno com CEP geral inclui bairro/logradouro na chave', () => {
  const a = chaveDedupe({ ...casa({ cep: '40000-000', bairro: 'Centro' }), tipo: 'terreno', area_m2: 300 });
  const b = chaveDedupe({ ...casa({ cep: '40000-000', bairro: 'Brotas' }), tipo: 'terreno', area_m2: 300 });
  assert.notEqual(a, b);
});
