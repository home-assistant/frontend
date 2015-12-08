if (__DEV__) {
  console.log('Service Worker initialized.');
}

self.addEventListener('install', event => {
  if (__DEV__) {
    console.log('Service Worker installed.');
  }
});

self.addEventListener('activate', event => {
  if (__DEV__) {
    console.log('Service Worker activated.');
    // Force refresh service worker
    event.waitUntil(global.clients.claim());
  }
});

self.addEventListener('onmessage', message => {
  if (__DEV__) {
    console.log('Message received', message);
  }
});
