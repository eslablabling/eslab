const CACHE_NAME = 'eslab-lims-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './dashboard.html',
  './sampling.html',
  './coa.html',
  './analisa.html',
  './dokumen.html',
  './peralatan.html',
  './master-data.html',
  './kelola-users.html',
  './login-klien.html',
  './portal-klien.html',
  './config.js',
  './auth.js',
  './sampling.js',
  './coa.js',
  './analisa.js',
  './pwa-install.js',
  './pwa-install.css',
  './mobile-nav.js',
  './mobile-nav.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './eslab-logo.gif',
  './logo_eslab.jpg',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;700;800&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Biarkan request database ke Supabase langsung lewat (bypass SW cache)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Stale-While-Revalidate: Kembalikan cache segera, lalu update di latar belakang
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => {/* Abaikan jika offline */});
          return cachedResponse;
        }

        return fetch(event.request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
            return networkResponse;
          })
          .catch(() => {
            // Jika navigasi halaman utama gagal saat offline, berikan fallback
            if (event.request.mode === 'navigate') {
              return caches.match('./dashboard.html') || caches.match('./index.html');
            }
          });
      })
  );
});
