/**
 * Teste de integração do ciclo de parceria (Fases 6–9) contra um Postgres real.
 * Rodar com: npm run test:db  (requer DATABASE_URL apontando para um banco de teste).
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool, query } from '../../db/pool';
import { criarImovel } from '../imoveis/imoveis.service';
import * as parcerias from './parcerias.service';

const ctx = { ip: '127.0.0.1', userAgent: 'test' };
let captadorId = '';
let compradorId = '';
let imovelId = '';
let parceriaId = '';

async function criarCorretor(nome: string, email: string): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO corretor (nome, email, papel, status, whatsapp, creci)
     VALUES ($1, $2, 'ambos', 'ativo', '+5571999990000', $3)
     RETURNING id`,
    [nome, email, `CRECI-${Math.random().toString(36).slice(2, 8)}`],
  );
  return rows[0].id;
}

before(async () => {
  await query(
    `TRUNCATE avaliacao, parceria_mensagem, parceria, termo_parceria_aceite, imovel, corretor RESTART IDENTITY CASCADE`,
  );
  captadorId = await criarCorretor('Ana Captadora', `cap${Date.now()}@ex.com`);
  compradorId = await criarCorretor('Bruno Comprador', `comp${Date.now()}@ex.com`);

  const imovel = await criarImovel(
    captadorId,
    {
      finalidade: 'venda',
      tipo: 'casa',
      preco: 500000,
      cidade: 'Salvador',
      bairro: 'Pituba',
      cep: '40000000',
      logradouro: 'Rua A',
      numero: '100',
      complemento: null,
      unidade: null,
      andar: null,
      bloco: null,
      nome_condominio: null,
      area_m2: 120,
      quartos: 3,
      suites: 1,
      banheiros: 2,
      vagas: 2,
      descricao: null,
      diferenciais: ['Piscina'],
      documentacao: ['Escritura'],
      fotos: ['a', 'b', 'c', 'd', 'e'],
      link_origem: undefined,
      exclusividade: false,
      confirmar_distinto: false,
      aceite_termo_parceria: true,
    } as never,
    ctx,
  );
  imovelId = imovel.id;
});

after(async () => {
  await pool.end();
});

test('registra o aceite do Termo de Parceria no cadastro do imóvel', async () => {
  const { rows } = await query<{ versao: string; ip: string }>(
    'SELECT versao, host(ip) AS ip FROM termo_parceria_aceite WHERE imovel_id = $1',
    [imovelId],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].versao, 'v2.1');
  assert.equal(rows[0].ip, '127.0.0.1');
});

test('comprador solicita parceria (status solicitada)', async () => {
  const r = await parcerias.solicitarParceria(compradorId, {
    imovel_id: imovelId,
    cliente_nome: 'Carlos Cliente',
    perfil_confirmado: true,
  });
  parceriaId = r.id;
  assert.equal(r.status, 'solicitada');
});

test('não permite solicitar parceria no próprio imóvel', async () => {
  await assert.rejects(() =>
    parcerias.solicitarParceria(captadorId, {
      imovel_id: imovelId,
      cliente_nome: 'X',
      perfil_confirmado: true,
    }),
  );
});

test('captador aceita a parceria', async () => {
  const r = await parcerias.aceitarParceria(parceriaId, captadorId);
  assert.equal(r.status, 'aceita');
});

test('simetria: comprador não registra visita; captador não insere CPF', async () => {
  await assert.rejects(() => parcerias.registrarVisita(parceriaId, compradorId, '2026-08-01'));
  await assert.rejects(() => parcerias.inserirCpf(parceriaId, captadorId, '52998224725'));
});

test('confirmação bilateral: visita + CPF → EM NEGOCIAÇÃO', async () => {
  const v = await parcerias.registrarVisita(parceriaId, captadorId, '2026-08-01');
  assert.equal(v.status, 'aceita'); // ainda falta o CPF
  const c = await parcerias.inserirCpf(parceriaId, compradorId, '52998224725');
  assert.equal(c.status, 'em_negociacao');

  const imv = await query<{ status: string }>('SELECT status FROM imovel WHERE id = $1', [imovelId]);
  assert.equal(imv.rows[0].status, 'em_negociacao');
});

test('Nível 3: contatos e CPF revelados ao captador após confirmação', async () => {
  const d = await parcerias.obterParceria(parceriaId, captadorId);
  assert.ok(d.contatos, 'contatos devem estar liberados');
  assert.equal(d.confirmacao.cpf_cliente, '52998224725');
});

test('declara venda: comissão 5% e taxa 10% da comissão', async () => {
  const r = await parcerias.declararVenda(parceriaId, captadorId, 500000);
  assert.equal(r.status, 'vendida');
  assert.equal(r.valor, 500000);
  assert.equal(r.comissao, 25000);
  assert.equal(r.taxa_plataforma, 2500);

  const imv = await query<{ status: string }>('SELECT status FROM imovel WHERE id = $1', [imovelId]);
  assert.equal(imv.rows[0].status, 'vendido');
});

test('confirma pagamento e libera avaliação mútua', async () => {
  const pg = await parcerias.confirmarPagamento(parceriaId);
  assert.equal(pg.pagamento_status, 'confirmado');

  await parcerias.avaliar(parceriaId, captadorId, 5, 'ótimo parceiro');
  await parcerias.avaliar(parceriaId, compradorId, 4);
  await assert.rejects(() => parcerias.avaliar(parceriaId, captadorId, 3)); // 1 por autor

  const { rows } = await query<{ n: string }>('SELECT count(*)::text AS n FROM avaliacao WHERE parceria_id = $1', [parceriaId]);
  assert.equal(rows[0].n, '2');
});
