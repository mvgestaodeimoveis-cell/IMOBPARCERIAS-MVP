import crypto from 'node:crypto';
import { env } from '../config/env';

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
  );
}

export interface UploadAssinatura {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  folder: string;
  signature: string;
}

/**
 * Gera uma assinatura para upload direto do navegador ao Cloudinary.
 * O API secret nunca sai do servidor; o cliente só recebe a assinatura.
 */
export function assinarUpload(folder = 'imoveis'): UploadAssinatura {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + env.CLOUDINARY_API_SECRET)
    .digest('hex');

  return {
    cloud_name: env.CLOUDINARY_CLOUD_NAME as string,
    api_key: env.CLOUDINARY_API_KEY as string,
    timestamp,
    folder,
    signature,
  };
}
