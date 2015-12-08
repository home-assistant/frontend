/* eslint-disable no-console */
const CACHE = '0.10';
const INDEX_CACHE_URL = '/';
const INDEX_ROUTES = ['/', '/logbook', '/history', '/map', '/devService', '/devState',
                      '/devEvent', '/devInfo', '/states'];

if (__DEV__) {
  console.log('Service Worker initialized.');
}

self.addEventListener('install', event => {
  if (__DEV__) {
    console.log('Service Worker installed.');
  }

  event.waitUntil(
    caches.open(CACHE).then(cache => cache.add(INDEX_CACHE_URL))
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

  if (event.request.mode !== 'same-origin' || !INDEX_ROUTES.includes(path)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(cache => {
      return cache.match(INDEX_CACHE_URL).then(cachedResponse => {
        const networkFetch = fetch(event.request).then(response => {
          cache.put(INDEX_CACHE_URL, response.clone());
          return response;
        });

        if (__DEV__ && cachedResponse) {
          console.log('Serving cached response for', path);
        }

        return cachedResponse || networkFetch;
      });
    })
  );
});
