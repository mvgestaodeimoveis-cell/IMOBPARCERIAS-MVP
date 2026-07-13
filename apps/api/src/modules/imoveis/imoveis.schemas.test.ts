import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarImovelSchema } from './imoveis.schemas';

const casaValida = {
  finalidade: 'venda' as const,
  tipo: 'casa' as const,
  preco: 500000,
  cidade: 'Salvador',
  bairro: 'Pituba',
  cep: '40000-000',
  logradouro: 'Rua A',
  numero: '100',
  area_m2: 120,
  quartos: 3,
  banheiros: 2,
  vagas: 2,
  diferenciais: ['Piscina'],
  documentacao: ['Escritura'],
  fotos: [],
  aceite_termo_parceria: true as const,
};

test('casa válida passa e normaliza CEP para 8 dígitos', () => {
  const r = criarImovelSchema.safeParse(casaValida);
  assert.equal(r.success, true);
  if (r.success) assert.equal(r.data.cep, '40000000');
});

test('exige aceite do Termo de Parceria', () => {
  const r = criarImovelSchema.safeParse({ ...casaValida, aceite_termo_parceria: false });
  assert.equal(r.success, false);
});

test('apartamento exige unidade e andar', () => {
  const semUnidade = criarImovelSchema.safeParse({ ...casaValida, tipo: 'apartamento' });
  assert.equal(semUnidade.success, false);
  const ok = criarImovelSchema.safeParse({ ...casaValida, tipo: 'apartamento', unidade: '101', andar: '10' });
  assert.equal(ok.success, true);
});

test('documentação é obrigatória (ao menos 1)', () => {
  const r = criarImovelSchema.safeParse({ ...casaValida, documentacao: [] });
  assert.equal(r.success, false);
});

test('exclusividade exige contrato e vencimento', () => {
  const r = criarImovelSchema.safeParse({ ...casaValida, exclusividade: true });
  assert.equal(r.success, false);
  const ok = criarImovelSchema.safeParse({
    ...casaValida,
    exclusividade: true,
    exclusividade_contrato_url: 'https://ex.com/contrato.pdf',
    exclusividade_vencimento: '2026-12-31',
  });
  assert.equal(ok.success, true);
});
