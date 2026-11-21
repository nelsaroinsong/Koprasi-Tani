/*
 * Service worker Koperasi Sinar Pagi Sejahtera.
 * Sengaja minimal & aman untuk data transaksi:
 * - API (/api/*), halaman admin, dan login TIDAK pernah di-cache (selalu data terbaru).
 * - Aset statis Next.js (/_next/static, ikon, gambar) di-cache agar cepat dibuka di sinyal lemah.
 * - Bila offline saat membuka halaman, tampilkan halaman /offline.html.
 */
const VERSION = 'v3'; // naikkan setiap ikon / aset statis berganti nama sama
const STATIC_CACHE = `koperasi-static-${VERSION}`;
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/icons/icon-192.png']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('koperasi-') && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Jangan pernah cache API, admin, autentikasi
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  // Aset statis: cache dulu, lalu jaringan
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || /\.(png|jpg|jpeg|webp|svg|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Halaman: selalu dari jaringan; offline -> halaman offline
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
  }
});
