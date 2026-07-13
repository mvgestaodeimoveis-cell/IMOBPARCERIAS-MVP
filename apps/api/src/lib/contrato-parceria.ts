import { TERMO_PARCERIA_VERSAO } from './termo-parceria';

export interface ContratoDados {
  captadorNome: string;
  captadorCreci: string | null;
  compradorNome: string;
  compradorCreci: string | null;
  clienteNome: string;
  imovelTipo: string;
  imovelBairro: string;
  imovelCidade: string;
  imovelPreco: number;
  janelaDias: number;
  status: string;
  criadoEm: string;
}

const TIPO_LABEL: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  terreno: 'Terreno',
  comercial: 'Imóvel comercial',
};

function moeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataBR(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

/**
 * Contrato de Parceria Digital (versão inicial — Fase 6).
 * Compõe os fatos da conexão com as condições comerciais já oficializadas no
 * Termo de Parceria aceito no cadastro do imóvel (comissão 10%, janela de 180 dias,
 * vedação à circunvenção). Não expõe endereço completo nem CPF (Níveis 2/3).
 */
export function gerarContratoParceria(d: ContratoDados): string {
  const tipo = TIPO_LABEL[d.imovelTipo] ?? d.imovelTipo;
  return `CONTRATO DE PARCERIA DIGITAL — IMOBPARCERIAS
Versão inicial · gerado em ${dataBR(d.criadoEm)}
Vinculado ao Termo de Parceria ${TERMO_PARCERIA_VERSAO}

PARTES
Corretor Captador: ${d.captadorNome}${d.captadorCreci ? ` (CRECI ${d.captadorCreci})` : ''} — titular do imóvel.
Corretor Comprador: ${d.compradorNome}${d.compradorCreci ? ` (CRECI ${d.compradorCreci})` : ''} — responsável pelo cliente.

OBJETO
Parceria de co-corretagem para o imóvel ${tipo}, em ${d.imovelBairro}, ${d.imovelCidade}, no valor anunciado de ${moeda(d.imovelPreco)}, com vistas ao cliente ${d.clienteNome} apresentado pelo Corretor Comprador.

CONDIÇÕES
1. As condições comerciais desta parceria seguem integralmente o Termo de Parceria ${TERMO_PARCERIA_VERSAO} aceito no cadastro do imóvel, incluindo a comissão de 10% devida à Plataforma pelo Corretor Captador em caso de negócio fechado.
2. Janela de proteção: ${d.janelaDias} dias, contados a partir da confirmação bilateral da visita, cobrindo o negócio fechado dentro ou fora da Plataforma nesse período.
3. O endereço completo do imóvel e os dados de contato dos corretores são revelados exclusivamente após a confirmação bilateral (registro da visita pelo Captador e inserção do CPF do cliente pelo Comprador).
4. É vedado às partes contornar a Plataforma para evitar a comissão devida, conforme a cláusula de não-circunvenção do Termo de Parceria.

SITUAÇÃO ATUAL: ${d.status.toUpperCase()}

Este documento é a versão inicial da parceria e será atualizado após a confirmação bilateral da visita.`;
}
