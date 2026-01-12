// Service Worker for offline functionality and caching
const CACHE_NAME = 'goods-vehicle-delivery-v1';
const RUNTIME_CACHE = 'goods-vehicle-delivery-runtime';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/booking.html',
  '/book.html',
  '/customer-login.html',
  '/driver.html',
  '/admin/dashboard.html',
  '/driver/dashboard.html',
  '/unified-dashboard.html',
  '/user.html',
  '/my-orders.html',
  '/success.html',
  '/otp-verify.html',
  '/css/style.css',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Failed to cache all assets during install:', err);
        // Continue even if some assets fail to cache
      });
    })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control immediately
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests and external requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle requests
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }

      return fetch(event.request).then(response => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Cache successful responses
        const responseToCache = response.clone();
        caches.open(RUNTIME_CACHE).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
        return caches.match(event.request);
      });
    })
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
