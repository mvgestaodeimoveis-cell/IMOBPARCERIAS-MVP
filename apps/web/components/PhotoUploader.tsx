'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { reportarErro } from '@/lib/telemetry';

interface Assinatura {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  folder: string;
  signature: string;
}

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

export function PhotoUploader({ value, onChange, max = 10 }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progresso, setProgresso] = useState<{ feitas: number; total: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErro(null);
    const token = getAccessToken();
    if (!token) return;

    const restantes = max - value.length;
    const selecionados = Array.from(files).slice(0, restantes);
    if (selecionados.length === 0) return;
    setUploading(true);
    setProgresso({ feitas: 0, total: selecionados.length });
    try {
      // Uma assinatura serve para todos os arquivos desta leva (válida por ~1h).
      const sig = await apiFetch<Assinatura>('/imoveis/upload-assinatura', {
        method: 'POST',
        token,
      });

      async function subirUm(file: File): Promise<string> {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('api_key', sig.api_key);
        fd.append('timestamp', String(sig.timestamp));
        fd.append('folder', sig.folder);
        fd.append('signature', sig.signature);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`,
          { method: 'POST', body: fd },
        );
        if (!res.ok) {
          // Repassa o motivo real do Cloudinary (tamanho, formato, assinatura, etc.).
          const corpo = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(corpo?.error?.message || `Falha no upload (HTTP ${res.status}).`);
        }
        const data = (await res.json()) as { secure_url: string };
        setProgresso((p) => (p ? { ...p, feitas: p.feitas + 1 } : p));
        return data.secure_url;
      }

      // Envia em paralelo com limite de concorrência: rápido, sem sobrecarregar a rede do celular.
      // Mantém a ordem da seleção (a 1ª foto continua sendo a capa).
      const CONCORRENCIA = 3;
      const resultados: (string | null)[] = new Array(selecionados.length).fill(null);
      let indice = 0;
      let erroMsg: string | null = null;

      async function worker() {
        while (indice < selecionados.length) {
          const meu = indice++;
          try {
            resultados[meu] = await subirUm(selecionados[meu]);
          } catch (e) {
            if (!erroMsg) erroMsg = e instanceof Error ? e.message : String(e);
            reportarErro('upload-foto', e, { indice: meu, total: selecionados.length });
          }
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(CONCORRENCIA, selecionados.length) }, worker),
      );

      const sucessos = resultados.filter((u): u is string => u !== null);
      if (sucessos.length > 0) onChange([...value, ...sucessos]);
      if (erroMsg) {
        const falhas = selecionados.length - sucessos.length;
        setErro(`Não foi possível enviar ${falhas} de ${selecionados.length} foto(s): ${erroMsg}`);
      }
    } catch (e) {
      reportarErro('upload-foto', e, { selecionadas: selecionados.length, jaEnviadas: value.length });
      setErro(
        e instanceof Error && e.message
          ? `Não foi possível enviar as fotos: ${e.message}`
          : 'Não foi possível enviar as fotos. Tente novamente.',
      );
    } finally {
      setUploading(false);
      setProgresso(null);
    }
  }

  function remover(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  function tornarCapa(url: string) {
    onChange([url, ...value.filter((u) => u !== url)]);
  }

  return (
    <div className="uploader">
      <div className="uploader-grid">
        {value.map((url, i) => (
          <div key={url} className="uploader-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Foto ${i + 1}`} />
            {i === 0 ? (
              <span className="uploader-cover">Capa</span>
            ) : (
              <button type="button" className="uploader-setcover" onClick={() => tornarCapa(url)}>
                Tornar capa
              </button>
            )}
            <button type="button" className="uploader-del" aria-label="Remover foto" onClick={() => remover(url)}>
              ×
            </button>
          </div>
        ))}

        {value.length < max && (
          <label className="uploader-add">
            {uploading ? '…' : '+'}
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              disabled={uploading}
              onChange={(e) => enviar(e.target.files)}
            />
          </label>
        )}
      </div>

      {erro && <div className="field-error">{erro}</div>}
      {uploading && progresso && (
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>
          Enviando fotos… {progresso.feitas} de {progresso.total}
        </p>
      )}
      <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>
        Até {max} fotos. A primeira é a capa do anúncio.
      </p>
    </div>
  );
}
