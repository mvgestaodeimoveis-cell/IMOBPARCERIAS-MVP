import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Informações do build/deploy expostas no /health para confirmar qual versão está no ar.
 * - version: lida do package.json (best-effort).
 * - commit: SHA curto do git (RENDER_GIT_COMMIT é injetado automaticamente pelo Render).
 * - startedAt: horário de boot do processo — proxy da data do deploy (o container reinicia a cada deploy).
 */
function lerVersao(): string | null {
  for (const caminho of [
    resolve(process.cwd(), 'package.json'),
    resolve(__dirname, '../../package.json'),
  ]) {
    try {
      const pkg = JSON.parse(readFileSync(caminho, 'utf8')) as { version?: string };
      if (pkg.version) return pkg.version;
    } catch {
      // tenta o próximo caminho
    }
  }
  return null;
}

const commitCompleto =
  process.env.RENDER_GIT_COMMIT ?? process.env.GIT_COMMIT ?? process.env.SOURCE_COMMIT ?? null;

export const buildInfo = {
  version: lerVersao(),
  commit: commitCompleto ? commitCompleto.slice(0, 7) : null,
  startedAt: new Date().toISOString(),
};
