// Minimal service worker — enables "installability" for the PWA install
// prompt. Not doing offline caching yet; safe to extend later.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
