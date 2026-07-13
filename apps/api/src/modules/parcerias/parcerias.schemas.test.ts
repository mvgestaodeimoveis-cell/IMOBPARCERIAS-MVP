import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  avaliacaoSchema,
  cpfSchema,
  mensagemSchema,
  solicitarParceriaSchema,
  vendaSchema,
  visitaSchema,
} from './parcerias.schemas';

test('aceita CPF válido (com e sem máscara)', () => {
  assert.equal(cpfSchema.safeParse({ cpf: '529.982.247-25' }).success, true);
  assert.equal(cpfSchema.safeParse({ cpf: '52998224725' }).success, true);
});

test('rejeita CPF inválido, repetido ou curto', () => {
  assert.equal(cpfSchema.safeParse({ cpf: '111.111.111-11' }).success, false);
  assert.equal(cpfSchema.safeParse({ cpf: '123' }).success, false);
  assert.equal(cpfSchema.safeParse({ cpf: '12345678900' }).success, false);
});

test('solicitar exige perfil confirmado e nome do cliente', () => {
  const ok = solicitarParceriaSchema.safeParse({
    imovel_id: '11111111-1111-1111-1111-111111111111',
    cliente_nome: 'Cliente Teste',
    perfil_confirmado: true,
  });
  assert.equal(ok.success, true);
  const semPerfil = solicitarParceriaSchema.safeParse({
    imovel_id: '11111111-1111-1111-1111-111111111111',
    cliente_nome: 'Cliente Teste',
    perfil_confirmado: false,
  });
  assert.equal(semPerfil.success, false);
});

test('venda exige valor positivo', () => {
  assert.equal(vendaSchema.safeParse({ valor: 500000 }).success, true);
  assert.equal(vendaSchema.safeParse({ valor: 0 }).success, false);
  assert.equal(vendaSchema.safeParse({ valor: -1 }).success, false);
});

test('mensagem não pode ser vazia', () => {
  assert.equal(mensagemSchema.safeParse({ corpo: 'Olá' }).success, true);
  assert.equal(mensagemSchema.safeParse({ corpo: '   ' }).success, false);
});

test('visita aceita data ISO (com ou sem hora)', () => {
  assert.equal(visitaSchema.safeParse({ visita_em: '2026-08-01' }).success, true);
  assert.equal(visitaSchema.safeParse({ visita_em: '2026-08-01T14:30' }).success, true);
  assert.equal(visitaSchema.safeParse({ visita_em: '01/08/2026' }).success, false);
});

test('avaliação exige nota entre 1 e 5', () => {
  assert.equal(avaliacaoSchema.safeParse({ nota: 5 }).success, true);
  assert.equal(avaliacaoSchema.safeParse({ nota: 0 }).success, false);
  assert.equal(avaliacaoSchema.safeParse({ nota: 6 }).success, false);
});
