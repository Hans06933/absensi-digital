const CACHE_NAME = 'absensi-pwa-v1';

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // Membiarkan request jaringan berjalan standar
    e.respondWith(fetch(e.request));
});