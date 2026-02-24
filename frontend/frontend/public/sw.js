// public/sw.js (PWA)
const CACHE = 'agrivision-v1';
const offlinePage = '/offline.html';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([
      '/', '/offline.html', '/static/css/', '/static/js/'
    ]))
  );
});