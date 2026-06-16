// The demo has no offline needs: take over from any previously installed
// worker, then do nothing. Having no fetch handler means requests go straight
// to the network and the worker stays transparent. The worker still exists so
// browsers offer the PWA install prompt.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim())
);
