import { pool, query } from './pool';
import { hashPassword } from '../lib/password';
import { TERMO_PARCERIA_VERSAO } from '../lib/termo-parceria';

/**
 * Popula dados de demonstração para validar o fluxo ponta a ponta.
 * Idempotente: remove os dados @demo.com e recria. NUNCA rode em produção com dados reais.
 * Uso: DATABASE_URL="..." JWT_SECRET="..." npm run seed:demo -w apps/api
 * Senha de todos os usuários de teste: Senha@123
 */

const SENHA = 'Senha@123';

interface ImovelSeed {
  finalidade: 'venda' | 'aluguel';
  tipo: 'apartamento' | 'casa' | 'terreno' | 'comercial';
  preco: number;
  cidade: string;
  bairro: string;
  cep: string;
  logradouro: string;
  numero: string;
  unidade?: string | null;
  andar?: string | null;
  area_m2: number;
  quartos: number;
  banheiros: number;
  vagas: number;
  status?: 'ativo' | 'inativo' | 'em_negociacao' | 'vendido';
  fotos: number; // quantidade de fotos placeholder
  exclusividade_status?: 'nao' | 'pendente' | 'verificada';
}

async function criarCorretor(
  nome: string,
  email: string,
  status: string,
  creci: string,
): Promise<string> {
  const senhaHash = await hashPassword(SENHA);
  const { rows } = await query<{ id: string }>(
    `INSERT INTO corretor (nome, email, senha_hash, papel, status, whatsapp, cidade, creci, email_verificado_em)
     VALUES ($1, $2, $3, 'ambos', $4, '+5571991541269', 'Salvador', $5, now())
     RETURNING id`,
    [nome, email, senhaHash, status, creci],
  );
  return rows[0].id;
}

async function criarImovel(corretorId: string, s: ImovelSeed, seed: number): Promise<string> {
  const fotos = Array.from({ length: s.fotos }, (_, k) => `https://picsum.photos/seed/${seed}-${k}/800/600`);
  const chave = `${s.cep}-${s.numero}-${s.unidade ?? ''}-${seed}`.toLowerCase();
  const predio = `${s.cep}-${s.numero}-${seed}`.toLowerCase();
  const { rows } = await query<{ id: string }>(
    `INSERT INTO imovel
       (corretor_id, finalidade, tipo, preco, cidade, bairro, cep, logradouro, numero,
        unidade, andar, area_m2, quartos, suites, banheiros, vagas, descricao,
        fotos, diferenciais, documentacao, chave_dedupe, chave_predio, origem, status,
        exclusividade, exclusividade_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0,$14,$15,$16,$17,$18,$19,$20,$21,'manual',$22,$23,$24)
     RETURNING id`,
    [
      corretorId,
      s.finalidade,
      s.tipo,
      s.preco,
      s.cidade,
      s.bairro,
      s.cep,
      s.logradouro,
      s.numero,
      s.unidade ?? null,
      s.andar ?? null,
      s.area_m2,
      s.quartos,
      s.banheiros,
      s.vagas,
      'Imóvel de demonstração para testes.',
      JSON.stringify(fotos),
      JSON.stringify(['Varanda', 'Portaria 24h']),
      JSON.stringify(['Escritura', 'IPTU em dia']),
      chave,
      predio,
      s.status ?? 'ativo',
      (s.exclusividade_status ?? 'nao') !== 'nao',
      s.exclusividade_status ?? 'nao',
    ],
  );
  return rows[0].id;
}

async function run() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Recusado: não rode o seed de demonstração com NODE_ENV=production.');
    process.exit(1);
  }

  console.log('Limpando dados @demo.com anteriores...');
  // Ordem de dependência (parceria e imovel têm FK que restringem a exclusão do corretor).
  const demo = `SELECT id FROM corretor WHERE email LIKE '%@demo.com'`;
  await query(
    `DELETE FROM parceria WHERE captador_id IN (${demo}) OR comprador_id IN (${demo})`,
  );
  await query(`DELETE FROM imovel WHERE corretor_id IN (${demo})`);
  await query(`DELETE FROM corretor WHERE email LIKE '%@demo.com'`);

  console.log('Criando corretores...');
  const joao = await criarCorretor('João Captador', 'joao.captador@demo.com', 'ativo', 'BA-10001');
  const maria = await criarCorretor('Maria Compradora', 'maria.compradora@demo.com', 'ativo', 'BA-10002');
  await criarCorretor('Pedro Pendente', 'pedro.pendente@demo.com', 'verificacao_pendente', 'BA-10003');
  await criarCorretor('Ana Suspensa', 'ana.suspensa@demo.com', 'suspenso', 'BA-10004');

  console.log('Criando imóveis...');
  // Disponível na vitrine (ficha completa).
  const imDisponivel = await criarImovel(
    joao,
    { finalidade: 'venda', tipo: 'apartamento', preco: 500000, cidade: 'Salvador', bairro: 'Pituba', cep: '41810000', logradouro: 'Rua da Pituba', numero: '100', unidade: '101', andar: '10', area_m2: 90, quartos: 3, banheiros: 2, vagas: 2, fotos: 5 },
    1,
  );
  // Exclusividade pendente (aparece na fila da equipe).
  await criarImovel(
    joao,
    { finalidade: 'venda', tipo: 'casa', preco: 850000, cidade: 'Lauro de Freitas', bairro: 'Vilas do Atlântico', cep: '42700000', logradouro: 'Alameda das Palmeiras', numero: '55', area_m2: 220, quartos: 4, banheiros: 3, vagas: 3, fotos: 6, exclusividade_status: 'pendente' },
    2,
  );
  // Inativo (para testar reativação/moderação).
  await criarImovel(
    joao,
    { finalidade: 'aluguel', tipo: 'apartamento', preco: 2500, cidade: 'Salvador', bairro: 'Barra', cep: '40140000', logradouro: 'Av. Oceânica', numero: '200', unidade: '502', andar: '5', area_m2: 70, quartos: 2, banheiros: 1, vagas: 1, fotos: 5, status: 'inativo' },
    3,
  );

  console.log('Criando uma solicitação de parceria (Maria → imóvel do João)...');
  await query(
    `INSERT INTO parceria (imovel_id, captador_id, comprador_id, cliente_nome, contrato_versao, janela_dias)
     VALUES ($1, $2, $3, 'Cliente Teste da Silva', $4, 180)`,
    [imDisponivel, joao, maria, TERMO_PARCERIA_VERSAO],
  );

  console.log('\n✔ Seed de demonstração concluído. Senha de todos: ' + SENHA);
  console.log('  - joao.captador@demo.com (ativo, captador com 3 imóveis)');
  console.log('  - maria.compradora@demo.com (ativo, com 1 solicitação enviada)');
  console.log('  - pedro.pendente@demo.com (verificação pendente)');
  console.log('  - ana.suspensa@demo.com (suspenso)');
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
