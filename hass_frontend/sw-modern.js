console.debug('Service worker disabled in development');

self.addEventListener('install', (event) => {
  // This will activate the dev service worker,
  // removing any prod service worker the dev might have running
  self.skipWaiting();
});
