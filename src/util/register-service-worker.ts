import { showToast } from "./toast";

const UPDATE_DELAY = 60_000;
const UPDATE_TOAST_ID = "frontend-update-available";

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

  // Set when the active worker changed while this page could not reload.
  let reloadPending = false;

  // If the active service worker changes, refresh the page because the cache has changed.
  // Another tab can activate the new worker, so wait until this page has no unsaved work.
  // Until then this page runs the old build under the new worker, so its lazy imports can
  // fail and go through stale build recovery instead.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!window.isDirtyState) {
      location.reload();
      return;
    }
    reloadPending = true;
  });

  const reg = await navigator.serviceWorker.register(`/sw-${__BUILD__}.js`);

  if (!notifyUpdate || __DEV__ || __DEMO__) {
    // No update toast here, so reload as soon as the page is clean.
    const reloadWhenClean = () => {
      if (reloadPending && !window.isDirtyState) {
        location.reload();
      }
    };
    window.addEventListener("dirty-state-changed", reloadWhenClean);
    // The page may have become clean while registering.
    reloadWhenClean();
    return;
  }

  let pendingWorker: ServiceWorker | undefined;
  let updateDeadline = 0;
  let updateInterval = 0;

  const hideUpdateToast = () => {
    showToast(rootEl, {
      id: UPDATE_TOAST_ID,
      message: "",
      duration: 0,
    });
  };

  const clearUpdateCountdown = () => {
    clearInterval(updateInterval);
  };

  const activateUpdate = () => {
    if (reloadPending) {
      clearUpdateCountdown();
      hideUpdateToast();
      location.reload();
      return;
    }
    if (!pendingWorker) {
      return;
    }
    clearUpdateCountdown();
    hideUpdateToast();
    pendingWorker.postMessage({ type: "skipWaiting" });
    pendingWorker = undefined;
  };

  const showUpdateToast = () => {
    const seconds = Math.ceil((updateDeadline - Date.now()) / 1000);
    if (seconds <= 0) {
      activateUpdate();
      return;
    }
    const announceSeconds =
      seconds > 40 ? 60 : seconds > 20 ? 40 : seconds > 5 ? 20 : 5;
    showToast(rootEl, {
      id: UPDATE_TOAST_ID,
      message: {
        translationKey: "ui.notification_toast.new_version_available",
        args: { seconds },
      },
      announceMessage: {
        translationKey: "ui.notification_toast.new_version_available",
        args: { seconds: announceSeconds },
      },
      action: {
        action: activateUpdate,
        primary: true,
        text: { translationKey: "ui.notification_toast.update_now" },
      },
      secondaryAction: {
        action: () => {
          pendingWorker = undefined;
          reloadPending = false;
          clearUpdateCountdown();
        },
        text: { translationKey: "ui.common.cancel" },
      },
      duration: -1,
    });
  };

  const startUpdateCountdown = () => {
    updateDeadline = Date.now() + UPDATE_DELAY;
    showUpdateToast();
    updateInterval = window.setInterval(showUpdateToast, 1000);
  };

  window.addEventListener("dirty-state-changed", () => {
    if (!pendingWorker && !reloadPending) {
      return;
    }
    if (window.isDirtyState) {
      clearUpdateCountdown();
      hideUpdateToast();
      return;
    }
    startUpdateCountdown();
  });

  const updateReady = (worker: ServiceWorker) => {
    clearUpdateCountdown();
    pendingWorker = worker;
    if (!window.isDirtyState) {
      startUpdateCountdown();
    }
  };

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
      updateReady(installingWorker);
    });
  });

  if (reg.waiting && navigator.serviceWorker.controller) {
    updateReady(reg.waiting);
  } else if (reloadPending && !window.isDirtyState) {
    // The page became clean while registering, before the listener above.
    startUpdateCountdown();
  }
};
