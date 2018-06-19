const serviceWorkerUrl = __BUILD__ === 'latest' ?
  '/service_worker.js' : '/service_worker_es5.js';

export default () => {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register(serviceWorkerUrl).then((reg) => {
    reg.addEventListener('updatefound', () => {
      const installingWorker = reg.installing;

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed' &&
            navigator.serviceWorker.controller &&
            !__DEV__) {
          location.reload();
        }
      });
    });
  });
};
