import type { NextRequest } from 'next/server';

// BFF: repassa qualquer chamada /api/* para o backend Node.js (server-to-server).
// O browser fala apenas com o próprio Next (mesma origem) — sem CORS e sem expor a URL da API.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000';

// Cabeçalhos que não devem ser repassados (hop-by-hop / recalculados pelo fetch).
const STRIP_REQUEST_HEADERS = ['host', 'connection', 'content-length', 'accept-encoding'];
const STRIP_RESPONSE_HEADERS = ['content-encoding', 'content-length', 'transfer-encoding'];

async function handler(req: NextRequest, ctx: { params: { path: string[] } }) {
  const path = ctx.params.path.join('/');
  const target = `${BACKEND_URL}/api/${path}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  for (const h of STRIP_REQUEST_HEADERS) headers.delete(h);

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    return Response.json(
      { error: { code: 'BFF_UPSTREAM_ERROR', message: 'Não foi possível acessar o servidor.' } },
      { status: 502 },
    );
  }

  const resHeaders = new Headers(upstream.headers);
  for (const h of STRIP_RESPONSE_HEADERS) resHeaders.delete(h);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
