import { showToast } from "./toast";

export const supportsServiceWorker = () =>
  "serviceWorker" in navigator &&
  (location.protocol === "https:" || location.hostname === "localhost");

export const registerServiceWorker = async (
  rootEl: HTMLElement,
  notifyUpdate = true
) => {
  if (!supportsServiceWorker()) {
    return;
  }

  // If the active service worker changes, refresh the page because the cache has changed
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    location.reload();
  });

  const reg = await navigator.serviceWorker.register("/service_worker.js");

  if (!notifyUpdate || __DEV__ || __DEMO__) {
    return;
  }

  reg.addEventListener("updatefound", () => {
    const installingWorker = reg.installing;

    if (!installingWorker) {
      return;
    }

    installingWorker.addEventListener("statechange", () => {
      if (
        installingWorker.state !== "installed" ||
        !navigator.serviceWorker.controller
      ) {
        return;
      }

      // Notify users a new frontend is available.
      showToast(rootEl, {
        message: "A new version of the frontend is available.",
        action: {
          // We tell the service worker to call skipWaiting, which activates
          // the new service worker. Above we listen for `controllerchange`
          // so we reload the page once a new service worker activates.
          action: () => installingWorker.postMessage({ type: "skipWaiting" }),
          text: "reload",
        },
        duration: 0,
        dismissable: false,
      });
    });
  });
};
