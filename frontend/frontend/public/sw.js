// public/sw.js (PWA)
const CACHE = 'agrivision-v1';
const OFFLINE_PAGE = '/offline.html';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([
      '/', OFFLINE_PAGE, '/static/css/', '/static/js/'
    ]))
  );
});
