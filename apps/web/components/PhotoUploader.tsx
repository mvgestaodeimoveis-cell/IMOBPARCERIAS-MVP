'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

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
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErro(null);
    const token = getAccessToken();
    if (!token) return;

    const restantes = max - value.length;
    const selecionados = Array.from(files).slice(0, restantes);
    setUploading(true);
    try {
      const novos: string[] = [];
      for (const file of selecionados) {
        const sig = await apiFetch<Assinatura>('/imoveis/upload-assinatura', {
          method: 'POST',
          token,
        });
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
        if (!res.ok) throw new Error('upload falhou');
        const data = (await res.json()) as { secure_url: string };
        novos.push(data.secure_url);
      }
      onChange([...value, ...novos]);
    } catch {
      setErro('Não foi possível enviar as fotos. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }

  function remover(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="uploader">
      <div className="uploader-grid">
        {value.map((url, i) => (
          <div key={url} className="uploader-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Foto ${i + 1}`} />
            {i === 0 && <span className="uploader-cover">Capa</span>}
            <button type="button" aria-label="Remover foto" onClick={() => remover(url)}>
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
      <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>
        Até {max} fotos. A primeira é a capa do anúncio.
      </p>
    </div>
  );
}
