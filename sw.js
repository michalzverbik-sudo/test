// Offline cache for app + admin + ZXing
const CACHE = 'bol-timer-pro-v1';
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './manifest.json',
  './zxing/index.js',
  './zxing/zxing_reader.wasm'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(()=>{})));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      const url = new URL(e.request.url);
      if (resp.ok && url.origin === location.origin) {
        const copy = resp.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, copy));
      }
      return resp;
    }).catch(() => cached))
  );
});
