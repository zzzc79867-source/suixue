const CACHE = 'suixue-v5';
const ASSETS = [
  './', './index.html', './css/style.css',
  './js/main.js', './js/store.js', './js/srs.js', './js/ui.js', './js/content.js', './js/planning.js',
  './js/views/home.js', './js/views/plan.js', './js/views/settings.js', './js/views/import.js', './js/views/study.js',
  './manifest.webmanifest', './icons/icon.svg',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './content/index.json'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.indexOf('/content/') !== -1) {
    e.respondWith(fetch(e.request).then((r) => {
      const c = r.clone();
      caches.open(CACHE).then((ca) => ca.put(e.request, c));
      return r;
    }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
