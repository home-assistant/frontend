import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  registerServiceWorker,
  supportsServiceWorker,
} from "../../src/util/register-service-worker";

class FakeServiceWorkerContainer extends EventTarget {
  public controller: ServiceWorker | null = null;

  public register = vi.fn();
}

const serviceWorkerDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "serviceWorker"
);

describe("supportsServiceWorker", () => {
  afterEach(() => {
    if (serviceWorkerDescriptor) {
      Object.defineProperty(
        navigator,
        "serviceWorker",
        serviceWorkerDescriptor
      );
    } else {
      Reflect.deleteProperty(navigator, "serviceWorker");
    }
  });

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
  let serviceWorker: FakeServiceWorkerContainer;

  beforeEach(() => {
    globalThis.__BUILD__ = "modern";
    serviceWorker = new FakeServiceWorkerContainer();
    serviceWorker.register.mockResolvedValue(new EventTarget());
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: serviceWorker,
    });
  });

  afterEach(() => {
    if (serviceWorkerDescriptor) {
      Object.defineProperty(
        navigator,
        "serviceWorker",
        serviceWorkerDescriptor
      );
    } else {
      Reflect.deleteProperty(navigator, "serviceWorker");
    }
  });

  it("registers the worker for the current build", async () => {
    await registerServiceWorker(document.createElement("div"), false);

    expect(serviceWorker.register).toHaveBeenCalledOnce();
    expect(serviceWorker.register).toHaveBeenCalledWith("/sw-modern.js");
  });

  it("does not register when service workers are unsupported", async () => {
    Reflect.deleteProperty(navigator, "serviceWorker");

    await registerServiceWorker(document.createElement("div"));

    expect(serviceWorker.register).not.toHaveBeenCalled();
  });
});
