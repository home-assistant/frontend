const serviceWorkerUrl =
  __BUILD__ === "latest" ? "/service_worker.js" : "/service_worker_es5.js";

export default () => {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register(serviceWorkerUrl).then((reg) => {
    reg.addEventListener("updatefound", () => {
      const installingWorker = reg.installing;
      installingWorker.addEventListener("statechange", () => {
        if (
          installingWorker.state === "installed" &&
          navigator.serviceWorker.controller &&
          !__DEV__
        ) {
          // Notify users here of a new frontend being available.
          import("./show-new-frontend-toast.js").then((mod) =>
            mod.default(installingWorker)
          );
        }
      });
    });
  });

  // If the active service worker changes, refresh the page because the cache has changed
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    location.reload();
  });
};
