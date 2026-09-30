const CACHE_NAME = 'absensi-qr-v2.62';

// Daftar seluruh aset & halaman yang wajib di-cache di awal (Pre-cache)
const URLS_TO_CACHE = [
  './',
  './index.html',
  './laporan.html',
  './kartuqrcode.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
];

// 1. Install Event: Download & simpan semua modul utama ke cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all core modules & pages');
      return cache.addAll(URLS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Bersihkan cache versi lama jika ada pembaruan
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Cache-First Strategy (Buka dari Cache dulu agar Instant, baru update dari Network)
self.addEventListener('fetch', (event) => {
  // Abaikan request POST / Google Apps Script
  if (event.request.method !== 'GET' || event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Kembalikan file dari cache secara instan
        // Sambil mengambil versi terbaru dari jaringan di latar belakang (Stale-While-Revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {/* Abaikan error jaringan jika sedang offline */});

        return cachedResponse;
      }

      // Jika file belum ada di cache, ambil dari jaringan lalu simpan
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});
