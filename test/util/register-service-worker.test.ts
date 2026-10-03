import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ShowToastParams } from "../../src/managers/notification-manager";
import {
  registerServiceWorker,
  supportsServiceWorker,
} from "../../src/util/register-service-worker";

class FakeWorker extends EventTarget {
  public state: ServiceWorkerState = "installing";

  public postMessage = vi.fn();
}

class FakeRegistration extends EventTarget {
  public installing: ServiceWorker | null = null;

  public waiting: ServiceWorker | null = null;
}

class FakeServiceWorkerContainer extends EventTarget {
  public controller: ServiceWorker | null = null;

  public register = vi.fn();
}

const serviceWorkerDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "serviceWorker"
);

const restoreServiceWorker = () => {
  if (serviceWorkerDescriptor) {
    Object.defineProperty(navigator, "serviceWorker", serviceWorkerDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "serviceWorker");
  }
};

describe("supportsServiceWorker", () => {
  afterEach(restoreServiceWorker);

  it("returns true when the service worker API is available", () => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: new FakeServiceWorkerContainer(),
    });

    expect(supportsServiceWorker()).toBe(true);
  });

  it("returns false when the service worker API is unavailable", () => {
    Reflect.deleteProperty(navigator, "serviceWorker");

    expect(supportsServiceWorker()).toBe(false);
  });
});

describe("registerServiceWorker", () => {
  let root: HTMLElement;
  let worker: FakeWorker;
  let registration: FakeRegistration;
  let serviceWorker: FakeServiceWorkerContainer;
  let notifications: ShowToastParams[];

  const latestNotification = () => notifications[notifications.length - 1];

  const setDirtyState = (isDirty: boolean) => {
    window.isDirtyState = isDirty;
    window.dispatchEvent(
      new CustomEvent("dirty-state-changed", { detail: { isDirty } })
    );
  };

  const installUpdate = () => {
    registration.installing = worker as unknown as ServiceWorker;
    registration.dispatchEvent(new Event("updatefound"));
    worker.state = "installed";
    worker.dispatchEvent(new Event("statechange"));
  };

  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.__BUILD__ = "modern";
    globalThis.__DEV__ = false;
    globalThis.__DEMO__ = false;
    window.isDirtyState = false;
    notifications = [];
    root = document.createElement("div");
    root.addEventListener("hass-notification", (event) => {
      notifications.push((event as CustomEvent<ShowToastParams>).detail);
    });
    worker = new FakeWorker();
    registration = new FakeRegistration();
    serviceWorker = new FakeServiceWorkerContainer();
    serviceWorker.controller = worker as unknown as ServiceWorker;
    serviceWorker.register.mockResolvedValue(registration);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: serviceWorker,
    });
  });

  afterEach(() => {
    latestNotification()?.secondaryAction?.action();
    vi.clearAllTimers();
    vi.useRealTimers();
    window.isDirtyState = false;
    globalThis.__DEV__ = false;
    globalThis.__DEMO__ = false;
    restoreServiceWorker();
  });

  it("registers the worker for the current build", async () => {
    await registerServiceWorker(root, false);

    expect(serviceWorker.register).toHaveBeenCalledOnce();
    expect(serviceWorker.register).toHaveBeenCalledWith("/sw-modern.js");
  });

  it("does not register when service workers are unsupported", async () => {
    Reflect.deleteProperty(navigator, "serviceWorker");

    await registerServiceWorker(root);

    expect(serviceWorker.register).not.toHaveBeenCalled();
  });

  it("listens for controller changes before registering", async () => {
    const addEventListener = vi.spyOn(serviceWorker, "addEventListener");

    await registerServiceWorker(root, false);

    expect(addEventListener).toHaveBeenCalledWith(
      "controllerchange",
      expect.any(Function)
    );
    expect(addEventListener.mock.invocationCallOrder[0]).toBeLessThan(
      serviceWorker.register.mock.invocationCallOrder[0]
    );
  });

  it.each([
    { notifyUpdate: false, dev: false, demo: false },
    { notifyUpdate: true, dev: true, demo: false },
    { notifyUpdate: true, dev: false, demo: true },
  ])(
    "does not monitor updates with notifyUpdate=$notifyUpdate, dev=$dev, demo=$demo",
    async ({ notifyUpdate, dev, demo }) => {
      globalThis.__DEV__ = dev;
      globalThis.__DEMO__ = demo;
      const addEventListener = vi.spyOn(registration, "addEventListener");

      await registerServiceWorker(root, notifyUpdate);

      expect(addEventListener).not.toHaveBeenCalledWith(
        "updatefound",
        expect.any(Function)
      );
    }
  );

  it("ignores update discovery without an installing worker", async () => {
    await registerServiceWorker(root);

    registration.dispatchEvent(new Event("updatefound"));

    expect(notifications).toHaveLength(0);
  });

  it("waits for an installing worker to reach the installed state", async () => {
    await registerServiceWorker(root);
    registration.installing = worker as unknown as ServiceWorker;
    registration.dispatchEvent(new Event("updatefound"));

    worker.state = "activating";
    worker.dispatchEvent(new Event("statechange"));

    expect(notifications).toHaveLength(0);
  });

  it("ignores an initial installation without an existing controller", async () => {
    serviceWorker.controller = null;
    await registerServiceWorker(root);

    installUpdate();

    expect(notifications).toHaveLength(0);
  });

  it("starts at 60 seconds when an update is installed", async () => {
    await registerServiceWorker(root);

    installUpdate();

    expect(latestNotification()).toMatchObject({
      id: "frontend-update-available",
      message: {
        translationKey: "ui.notification_toast.new_version_available",
        args: { seconds: 60 },
      },
      announceMessage: {
        args: { seconds: 60 },
      },
      action: {
        primary: true,
        text: { translationKey: "ui.notification_toast.update_now" },
      },
      secondaryAction: {
        text: { translationKey: "ui.common.cancel" },
      },
      duration: -1,
    });
  });

  it("uses an already waiting worker", async () => {
    registration.waiting = worker as unknown as ServiceWorker;

    await registerServiceWorker(root);

    expect(latestNotification().message).toMatchObject({
      args: { seconds: 60 },
    });
  });

  it("ignores a waiting worker without an existing controller", async () => {
    registration.waiting = worker as unknown as ServiceWorker;
    serviceWorker.controller = null;

    await registerServiceWorker(root);

    expect(notifications).toHaveLength(0);
  });

  it.each([
    { elapsed: 1_000, visual: 59, announced: 60 },
    { elapsed: 20_000, visual: 40, announced: 40 },
    { elapsed: 40_000, visual: 20, announced: 20 },
    { elapsed: 55_000, visual: 5, announced: 5 },
    { elapsed: 59_000, visual: 1, announced: 5 },
  ])(
    "shows $visual seconds and announces $announced after $elapsed ms",
    async ({ elapsed, visual, announced }) => {
      await registerServiceWorker(root);
      installUpdate();

      vi.advanceTimersByTime(elapsed);

      expect(latestNotification().message).toMatchObject({
        args: { seconds: visual },
      });
      expect(latestNotification().announceMessage).toMatchObject({
        args: { seconds: announced },
      });
    }
  );

  it("activates and hides the update when the countdown finishes", async () => {
    await registerServiceWorker(root);
    installUpdate();

    vi.advanceTimersByTime(60_000);

    expect(worker.postMessage).toHaveBeenCalledOnce();
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "skipWaiting" });
    expect(latestNotification()).toMatchObject({
      id: "frontend-update-available",
      message: "",
      duration: 0,
    });
  });

  it("activates and hides the update immediately on request", async () => {
    await registerServiceWorker(root);
    installUpdate();

    latestNotification().action!.action();

    expect(worker.postMessage).toHaveBeenCalledOnce();
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "skipWaiting" });
    expect(latestNotification()).toMatchObject({ message: "", duration: 0 });
  });

  it("cancels automatic activation", async () => {
    await registerServiceWorker(root);
    installUpdate();

    latestNotification().secondaryAction!.action();
    vi.advanceTimersByTime(60_000);

    expect(worker.postMessage).not.toHaveBeenCalled();
  });

  it("defers the message and activation while the page is dirty", async () => {
    setDirtyState(true);
    await registerServiceWorker(root);
    installUpdate();

    expect(notifications).toHaveLength(0);
    vi.advanceTimersByTime(60_000);
    expect(worker.postMessage).not.toHaveBeenCalled();

    setDirtyState(false);
    expect(latestNotification().message).toMatchObject({
      args: { seconds: 60 },
    });
  });

  it("hides and resets the countdown when the page becomes dirty", async () => {
    await registerServiceWorker(root);
    installUpdate();
    vi.advanceTimersByTime(10_000);

    setDirtyState(true);

    expect(latestNotification()).toMatchObject({ message: "", duration: 0 });
    vi.advanceTimersByTime(60_000);
    expect(worker.postMessage).not.toHaveBeenCalled();

    setDirtyState(false);
    expect(latestNotification().message).toMatchObject({
      args: { seconds: 60 },
    });
  });

  it("uses the latest installed worker", async () => {
    await registerServiceWorker(root);
    installUpdate();
    const replacement = new FakeWorker();
    replacement.state = "installed";

    registration.installing = replacement as unknown as ServiceWorker;
    registration.dispatchEvent(new Event("updatefound"));
    replacement.dispatchEvent(new Event("statechange"));
    vi.advanceTimersByTime(60_000);

    expect(worker.postMessage).not.toHaveBeenCalled();
    expect(replacement.postMessage).toHaveBeenCalledWith({
      type: "skipWaiting",
    });
  });
});
