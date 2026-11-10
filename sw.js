// Offline support (brief: Practice and a downloaded Daily Melody work offline).
// Network-first for pages and content (fresh when online), cache fallback when offline;
// cache-first for hashed build assets.
const CACHE = 'eartrainer-v4';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './content/content.v1.json', './icon.svg', './icon-180.png', './icon-192.png', './manifest.webmanifest'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const isAsset = new URL(req.url).pathname.includes('/assets/');
  if (isAsset) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    })));
    return;
  }
  e.respondWith(fetch(req).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
    return res;
  }).catch(() => caches.match(req).then((hit) => hit || caches.match('./'))));
});
