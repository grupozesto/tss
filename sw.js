const CACHE_NAME = 'tss-v8';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/noticias.html',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET, Firebase, YouTube API, analytics
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('firebaseio.com') || url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com') || url.hostname.includes('firestore')) return;

  // Stale-while-revalidate for HTML pages
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Cache-first for static assets (fonts, icons, CDN)
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|woff2?|ttf|eot|css|js)$/) ||
      url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('cdn.dl.uy') || url.hostname.includes('cdnjs.cloudflare.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }
});
