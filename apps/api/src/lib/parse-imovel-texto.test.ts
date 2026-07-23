import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImovelTexto } from './parse-imovel-texto';

// Caso real do cliente (jul/2026): "casa em condomínio" era classificada como
// apartamento porque o apelido "apê" (regex ap[êe]) casava com "ape" em "apenas".
test('casa em condomínio não vira apartamento (bug do "apenas")', () => {
  const texto = `EXCELENTE CASA 3 quartos em Condomínio a 3 minutos da Praia de Ipitanga

Unidades a partir de 117 m², quintal Garden, 1 vaga de garagem (até 2)

TÉRREO: Sala com 2 ambientes, 1 quarto, lavabo, cozinha integrada

PAVIMENTO SUPERIOR: 2 suítes sendo 1 Master com varanda

Condomínio com apenas 10 casas, piscina com cascata, churrasqueira

INVESTIMENTO: R$ 620.000,00`;
  const r = parseImovelTexto(texto);
  assert.equal(r.tipo, 'casa');
  assert.equal(r.finalidade, 'venda');
  assert.equal(r.preco, 620000);
  assert.equal(r.area_m2, 117);
  assert.equal(r.quartos, 3);
  assert.equal(r.suites, 2);
});

test('apartamento continua sendo reconhecido', () => {
  const r = parseImovelTexto('Apartamento 2 quartos, 1 suíte, 60m², R$ 350.000');
  assert.equal(r.tipo, 'apartamento');
});

test('"ap" e "apê" só contam como palavra inteira (não dentro de outra palavra)', () => {
  // "apenas" e "apesar" não devem indicar apartamento.
  const r = parseImovelTexto('Casa térrea, apenas 2 quartos, apesar do tamanho. R$ 300 mil');
  assert.equal(r.tipo, 'casa');
});
