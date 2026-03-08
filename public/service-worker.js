/**
 * Service Worker for Space Reset Coach
 * Enables offline functionality and PWA capabilities
 */

const CACHE_NAME = 'space-reset-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/app.css',
  '/manifest.json'
];

// Install service worker and cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: caching assets');
      return cache.addAll(urlsToCache).catch((error) => {
        console.log('Cache error:', error);
        // Don't fail install if cache fails
      });
    })
  );
  self.skipWaiting();
});

// Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('Service Worker: deleting old cache', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Network first strategy with fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip third-party APIs (Gemini)
  if (event.request.url.includes('generativelanguage.googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fall back to cache if network fails
        return caches.match(event.request).then((cachedResponse) => {
          return (
            cachedResponse ||
            new Response(
              'Offline - Application not available. Check your connection.',
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'text/plain'
                })
              }
            )
          );
        });
      })
  );
});

// Handle push notifications (future feature)
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Service Worker: push received with no data');
    return;
  }

  const options = {
    body: event.data.text(),
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'space-reset-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('Space Reset Coach', options)
  );
});
