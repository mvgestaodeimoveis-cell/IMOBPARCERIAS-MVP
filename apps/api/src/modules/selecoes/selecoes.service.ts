import { randomBytes } from 'node:crypto';
import { query } from '../../db/pool';
import { getCorretorById } from '../auth/auth.service';

// Alfabeto sem caracteres ambíguos (0/O, 1/l/I) — código curto e fácil de ditar.
const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789';

function gerarCodigo(tamanho = 7): string {
  const bytes = randomBytes(tamanho);
  let codigo = '';
  for (let i = 0; i < tamanho; i++) codigo += ALFABETO[bytes[i] % ALFABETO.length];
  return codigo;
}

export interface SelecaoPublica {
  ids: string[];
  corretor?: string;
  whatsapp?: string;
}

/**
 * Guarda a seleção de imóveis do corretor e devolve um código curto para o link /ver/<codigo>.
 * O nome e o WhatsApp são lidos do próprio corretor logado (não confiamos no cliente).
 */
export async function criarSelecao(corretorId: string, ids: string[]): Promise<{ codigo: string }> {
  const corretor = await getCorretorById(corretorId);
  const idsLimpos = [...new Set(ids.filter(Boolean))].slice(0, 20);

  // Em caso raríssimo de colisão do código (UNIQUE), tenta de novo.
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = gerarCodigo();
    try {
      await query(
        `INSERT INTO selecao_compartilhada (codigo, corretor_id, imovel_ids, corretor_nome, whatsapp)
         VALUES ($1, $2, $3::jsonb, $4, $5)`,
        [codigo, corretorId, JSON.stringify(idsLimpos), corretor?.nome ?? null, corretor?.whatsapp ?? null],
      );
      return { codigo };
    } catch (e) {
      if ((e as { code?: string }).code === '23505') continue;
      throw e;
    }
  }
  throw new Error('Não foi possível gerar o link. Tente novamente.');
}

export async function obterSelecao(codigo: string): Promise<SelecaoPublica | null> {
  const { rows } = await query<{
    imovel_ids: string[];
    corretor_nome: string | null;
    whatsapp: string | null;
  }>(
    `SELECT imovel_ids, corretor_nome, whatsapp FROM selecao_compartilhada WHERE codigo = $1`,
    [codigo],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    ids: Array.isArray(r.imovel_ids) ? r.imovel_ids : [],
    corretor: r.corretor_nome ?? undefined,
    whatsapp: r.whatsapp ?? undefined,
  };
}
