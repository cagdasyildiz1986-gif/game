/* Basit uygulama-kabugu onbellegi - offline acilis ve hizli yukleme icin. */
const CACHE = 'aurum-v3';
// Goreli yollar: uygulama hem kok dizinde (Node sunucusu) hem de
// alt dizinde (GitHub Pages: /<repo>/) ayni sekilde calisir.
const SHELL = [
  './',
  './index.html',
  './game.html',
  './css/site.css',
  './css/style.css',
  './js/site.js',
  './js/api.js',
  './js/env.js',
  './js/icons.js',
  './js/cover.js',
  './js/app.js',
  './js/live.js',
  './js/admin.js',
  './css/live.css',
  './live.html',
  './js/audio.js',
  './js/reels.js',
  './js/symbols.js',
  './manifest.webmanifest',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // API istekleri asla onbelleklenmez - oyun sonuclari her zaman sunucudan gelir.
  if (url.pathname.startsWith('/api/')) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
