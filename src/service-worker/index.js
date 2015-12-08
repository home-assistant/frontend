/* eslint-disable no-console */
const CACHE = '0.10';
const INDEX_CACHE_URL = '/';
const INDEX_ROUTES = ['/', '/logbook', '/history', '/map', '/devService', '/devState',
                      '/devEvent', '/devInfo', '/states'];
const CACHE_URLS = [
  '/static/favicon-192x192.png',
];

if (__DEV__) {
  console.log('Service Worker initialized.');
}

self.addEventListener('install', event => {
  if (__DEV__) {
    console.log('Service Worker installed.');
  }

  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CACHE_URLS.concat(INDEX_CACHE_URL)))
  );
});

self.addEventListener('activate', event => {
  if (__DEV__) {
    console.log('Service Worker activated.');
    // Force refresh service worker
    event.waitUntil(global.clients.claim());
  }
});

self.addEventListener('message', event => {
  if (__DEV__) {
    console.log('Message received', event.data);
  }
});

self.addEventListener('fetch', event => {
  const path = event.request.url.substr(event.request.url.indexOf('/', 7));

  // TODO: do not cache requests to 3rd party hosts (or remove those calls)

  if (CACHE_URLS.includes(path)) {
    event.respondWith(
      caches.open(CACHE).then(cache => cache.match(event.request))
    );
  }

  if (!INDEX_ROUTES.includes(path)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(cache => {
      return cache.match(INDEX_CACHE_URL).then(cachedResponse => {
        const networkFetch = fetch(event.request).then(response => {
          cache.put(INDEX_CACHE_URL, response.clone());
          return response;
        });

        return cachedResponse || networkFetch;
      });
    })
  );
});
