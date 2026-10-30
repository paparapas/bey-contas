// Offline cache. Bump VERSION on every release so installed apps update.
const VERSION = 'v2';
const SHELL = `shell-${VERSION}`;
const RUNTIME = 'runtime';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/store.js', 'js/calc.js', 'js/ui.js', 'js/nav.js', 'js/item-sheet.js',
  'js/views/resumo.js', 'js/views/artigos.js', 'js/views/colecao.js', 'js/views/calculadora.js', 'js/views/mais.js',
  'data/parts.json', 'img/icon-180.png', 'img/icon-192.png', 'img/icon-512.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' skips the browser's HTTP cache, so a new version never stores old files.
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('shell-') && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
    // Warm the part photos so the catalog works offline.
    const parts = await (await caches.match('data/parts.json'))?.json().catch(() => null);
    if (parts) {
      const rt = await caches.open(RUNTIME);
      for (const p of parts) if (p.img && !(await rt.match(p.img))) await rt.add(p.img).catch(() => {});
    }
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Exchange rate: always live.
  if (url.hostname.includes('frankfurter')) return;
  // Part photos and fonts: cache first.
  if (url.pathname.includes('/img/parts/') || url.hostname.includes('fonts.')) {
    e.respondWith(caches.open(RUNTIME).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; })));
    return;
  }
  // App shell: cache first, fall back to network.
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req)));
});
