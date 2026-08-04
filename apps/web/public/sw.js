/* Service worker do Imob Parcerias.
 *
 * Objetivo principal: tornar o app "instalável" na tela do celular. O Chrome no Android
 * só oferece "Instalar aplicativo" (o evento beforeinstallprompt) quando existe um service
 * worker com handler de fetch. Sem ele, o convite de instalação nunca aparece.
 *
 * Estratégia conservadora (network-first) para NUNCA servir conteúdo desatualizado enquanto
 * houver rede; o cache serve apenas de reserva quando o aparelho está offline. A API (/api)
 * e domínios externos nunca são interceptados.
 */
const CACHE = 'imob-shell-v1';
const OFFLINE_URL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll([OFFLINE_URL, '/manifest.webmanifest']).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Só o próprio domínio. NUNCA interceptamos a API (dados dinâmicos/sensíveis) nem CDNs.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;

  // Páginas (navegação): network-first, com a última página em cache como reserva offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(OFFLINE_URL, copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(OFFLINE_URL))),
    );
    return;
  }

  // Estáticos com hash imutável (chunks do Next), ícones e manifest: cache-first.
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icon') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/apple-touch-icon.png'
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        });
      }),
    );
  }
});
