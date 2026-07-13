import crypto from 'node:crypto';

/**
 * Termo de Parceria aceito no cadastro de cada imóvel (Fase 2 / Nota 17 do escopo).
 * Texto oficial fornecido pelo cliente (MVCLICK INOVA SIMPLES).
 *
 * A versão + o hash SHA-256 deste texto são gravados junto ao aceite de cada imóvel,
 * servindo como prova da manifestação de vontade. Ao atualizar o texto, incremente
 * também TERMO_PARCERIA_VERSAO — o hash é recalculado automaticamente.
 */
export const TERMO_PARCERIA_VERSAO = 'v2.1';

export const TERMO_PARCERIA_TEXTO = `TERMO DE PARCERIA — CADASTRO DE IMÓVEL
Plataforma ImobParcerias
Última atualização: 13/07/2026

Ao cadastrar imóveis nesta plataforma (www.imobparcerias.com.br), operada por MVCLICK INOVA SIMPLES, CNPJ 67.872.231/0001-66 ("Plataforma" ou "ImobParcerias"), o Corretor Parceiro declara e aceita integralmente os seguintes termos, complementares ao Termo de Uso e à Política de Privacidade da Plataforma:

1. Autorização e responsabilidade pelo imóvel
O imóvel cadastrado é captação do Corretor Parceiro, que possui autorização e ciência do proprietário para intermediação e vendas, locações ou qualquer negócio imobiliário. O Corretor assume total responsabilidade por qualquer irregularidade no cadastro, autorização ou condição do imóvel, inclusive nas esferas civil e penal.

2. Definições
Para fins deste Termo, considera-se "negócio fechado": venda, locação (residencial ou comercial) e permuta de imóvel intermediados a partir de conexão viabilizada pela Plataforma entre o Corretor Parceiro cadastrante e outro Corretor Parceiro. Não estão incluídas outras modalidades de negócio jurídico não listadas aqui, salvo acordo expresso entre as partes.

3. Comissão da Plataforma — 10% paga pelo Cadastrante
3.1. Caso a Plataforma realize a conexão entre o Corretor Parceiro (Cadastrante) e outro Corretor Parceiro que traga o cliente comprador ou locatário, resultando em negócio fechado conforme definido na cláusula 2, a Plataforma receberá exclusivamente do Corretor Parceiro (Cadastrante) 10% (dez por cento) da comissão total paga pelo proprietário pelo negócio.
3.2. O repasse será efetuado pelo Corretor Parceiro em até 3 (três) dias úteis após o recebimento de sua comissão integral, via PIX, para os dados bancários informados pela Plataforma.

4. Atraso no repasse
4.1. O não pagamento da comissão devida à Plataforma no prazo da cláusula 3.2 sujeita o Corretor Parceiro a: a) multa de 2% (dois por cento) sobre o valor devido; b) juros de mora de 1% (um por cento) ao mês, pro rata die, a partir do vencimento; c) suspensão imediata da conta na Plataforma até a regularização, sem prejuízo de cobrança judicial ou extrajudicial do valor devido, acrescido de honorários advocatícios em caso de necessidade de cobrança judicial.
4.2. Comissões não pagas em até 30 dias do vencimento poderão ser objeto de protesto e/ou inscrição em cadastros de proteção ao crédito, sem prejuízo de outras medidas cabíveis.

5. Vedação à circunvenção (não contornar a Plataforma)
5.1. Uma vez que a Plataforma tenha viabilizado a conexão entre Corretores Parceiros para um determinado imóvel e cliente — comprovada por registro de conexão no sistema, troca de mensagens via Plataforma, ou confirmação de visita —, é vedado a qualquer dos Corretores Parceiros envolvidos: a) excluir a Plataforma da negociação para evitar o pagamento da comissão devida (cláusula 3); b) fechar o negócio diretamente com a contraparte identificada através da Plataforma sem reportar a conclusão do negócio; c) orientar o proprietário ou o cliente a formalizar o negócio por fora da conexão originada na Plataforma.
5.2. Presunção de vínculo: caso um negócio seja fechado entre o imóvel cadastrado e um cliente que tenha sido apresentado ou identificado através de conexão viabilizada pela Plataforma dentro de um prazo de 6 (seis) meses a partir da data da conexão, presume-se que o negócio decorre da atuação da Plataforma, cabendo ao Corretor Parceiro o ônus de provar o contrário.
5.2.1. Encerrado o prazo do item 5.2, a Plataforma preserva o direito de cobrar a comissão devida (cláusula 3) mediante comprovação do vínculo entre a conexão originada na Plataforma e o negócio fechado, ainda que sem o benefício da presunção automática.
5.3. A violação desta cláusula sujeita o Corretor Parceiro infrator ao pagamento da comissão integral devida à Plataforma (cláusula 3), acrescida de multa equivalente a esse mesmo valor, a título de cláusula penal compensatória, sem prejuízo de perdas e danos comprovados.

6. Indenização
O Corretor Parceiro compromete-se a indenizar e manter a Plataforma indene de quaisquer perdas, danos, multas, custas ou honorários advocatícios decorrentes de: a) irregularidade na captação, autorização ou condição do imóvel cadastrado; b) informações falsas ou desatualizadas inseridas no cadastro; c) reclamação de proprietário, cliente ou terceiro relacionada à conduta do Corretor Parceiro na negociação.

7. Dados pessoais de clientes inseridos pelo Corretor
7.1. Ao inserir dados pessoais de clientes (nome, CPF, telefone) na Plataforma para fins de conexão de negócio, o Corretor Parceiro declara que informou o titular desses dados de que suas informações serão processadas pela ImobParcerias para essa finalidade, conforme a Política de Privacidade da Plataforma.
7.2. O Corretor Parceiro é responsável, perante a Plataforma e perante o titular dos dados, por garantir que possui base legal para o compartilhamento desses dados com a ImobParcerias.

8. Obrigações gerais
O Corretor Parceiro obriga-se a: manter os dados do imóvel atualizados e verídicos; notificar a Plataforma imediatamente sobre qualquer negócio realizado, inclusive quando fechado sem intermediação direta da conexão original; cumprir as normas do CRECI e a legislação imobiliária vigente.

9. Vigência e rescisão
Este Termo tem vigência indeterminada, podendo ser rescindido por qualquer parte com aviso prévio de 30 dias. Parcerias em andamento (negócios em curso originados de conexão já viabilizada) não são afetadas pela rescisão, e as obrigações de pagamento de comissão e a vedação de circunvenção (cláusula 5) permanecem válidas pelos prazos nelas estabelecidos, mesmo após o encerramento da conta.

10. Foro e legislação aplicável
Este Termo é regido pelas leis brasileiras. Fica eleito o foro da comarca de Salvador/BA para dirimir controvérsias decorrentes deste Termo, com renúncia a qualquer outro, por mais privilegiado que seja.

11. Aceitação
O Corretor Parceiro declara ter lido, compreendido e aceito todos os termos acima, sem reservas. O aceite é registrado eletronicamente com data, hora, endereço IP, identificação do Corretor Parceiro (CPF/CRECI) e a versão exata deste documento, para fins de comprovação de manifestação de vontade.`;

export const TERMO_PARCERIA_HASH = crypto
  .createHash('sha256')
  .update(TERMO_PARCERIA_TEXTO, 'utf8')
  .digest('hex');

/** Pontos principais exibidos em destaque antes do aceite (aviso em camadas). */
export const TERMO_PARCERIA_RESUMO = [
  {
    icone: '📍',
    titulo: 'Responsabilidade pelo imóvel',
    texto:
      'O imóvel cadastrado é captação do Corretor Parceiro, que possui autorização e ciência do proprietário para intermediação. O Corretor assume total responsabilidade por qualquer irregularidade, inclusive civil e penal.',
  },
  {
    icone: '💰',
    titulo: 'Comissão da Plataforma — 10%',
    texto:
      'Se a Plataforma conectar você a outro corretor parceiro e o negócio for fechado (venda, locação ou permuta), você paga 10% da comissão total à Plataforma, via PIX, em até 3 dias úteis após receber sua comissão.',
  },
  {
    icone: '🔒',
    titulo: 'Proteção contra desvio da parceria',
    texto:
      'Se o negócio for fechado por fora para evitar essa comissão, você continua devendo o valor integral + multa equivalente — mesmo que o negócio só seja formalizado até 6 meses depois da conexão feita pela Plataforma.',
  },
];
