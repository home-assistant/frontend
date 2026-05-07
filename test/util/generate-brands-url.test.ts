import { assert, describe, it, vi, afterEach } from "vitest";
import type { HomeAssistant } from "../../src/types";
import {
  addBrandsAuth,
  brandsUrl,
  clearBrandsTokenRefresh,
  fetchBrandsAccessToken,
  scheduleBrandsTokenRefresh,
} from "../../src/util/brands-url";

describe("Generate brands Url", () => {
  it("Generate logo brands url for cloud component", () => {
    assert.strictEqual(
      brandsUrl(
        { domain: "cloud", type: "logo" },
        "http://homeassistant.local:8123"
      ),
      "http://homeassistant.local:8123/api/brands/integration/cloud/logo.png"
    );
  });
  it("Generate icon brands url for cloud component", () => {
    assert.strictEqual(
      brandsUrl(
        { domain: "cloud", type: "icon" },
        "http://homeassistant.local:8123"
      ),
      "http://homeassistant.local:8123/api/brands/integration/cloud/icon.png"
    );
  });

  it("Generate dark theme optimized logo brands url for cloud component", () => {
    assert.strictEqual(
      brandsUrl(
        { domain: "cloud", type: "logo", darkOptimized: true },
        "http://homeassistant.local:8123"
      ),
      "http://homeassistant.local:8123/api/brands/integration/cloud/dark_logo.png"
    );
  });
});

describe("addBrandsAuth", () => {
  it("Returns non-brands URLs unchanged", () => {
    assert.strictEqual(
      addBrandsAuth(
        "/api/camera_proxy/camera.foo?token=abc",
        "http://homeassistant.local:8123"
      ),
      "/api/camera_proxy/camera.foo?token=abc"
    );
  });

  it("Returns brands URL unchanged when no token is available", () => {
    assert.strictEqual(
      addBrandsAuth(
        "/api/brands/integration/demo/icon.png",
        "http://homeassistant.local:8123"
      ),
      "/api/brands/integration/demo/icon.png"
    );
  });

  it("Appends token to brands URL when token is available", async () => {
    const mockHass = {
      callWS: async () => ({ token: "test-token-123" }),
    } as unknown as HomeAssistant;
    await fetchBrandsAccessToken(mockHass);

    assert.strictEqual(
      addBrandsAuth(
        "/api/brands/integration/demo/icon.png",
        "http://homeassistant.local:8123"
      ),
      "http://homeassistant.local:8123/api/brands/integration/demo/icon.png?token=test-token-123"
    );
  });

  it("Replaces existing token param instead of duplicating", async () => {
    const mockHass = {
      callWS: async () => ({ token: "new-token" }),
    } as unknown as HomeAssistant;
    await fetchBrandsAccessToken(mockHass);

    assert.strictEqual(
      addBrandsAuth(
        "/api/brands/integration/demo/icon.png?token=old-token",
        "http://homeassistant.local:8123"
      ),
      "http://homeassistant.local:8123/api/brands/integration/demo/icon.png?token=new-token"
    );
  });
});

describe("scheduleBrandsTokenRefresh", () => {
  afterEach(() => {
    clearBrandsTokenRefresh();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("Refreshes the token after 30 minutes", async () => {
    vi.useFakeTimers();
    let callCount = 0;
    const mockHass = {
      callWS: async () => {
        callCount++;
        return { token: `token-${callCount}` };
      },
    } as unknown as HomeAssistant;

    await fetchBrandsAccessToken(mockHass);
    assert.strictEqual(callCount, 1);
    assert.strictEqual(
      brandsUrl(
        { domain: "test", type: "icon" },
        "http://homeassistant.local:8123"
      ),
      "http://homeassistant.local:8123/api/brands/integration/test/icon.png?token=token-1"
    );

    scheduleBrandsTokenRefresh(mockHass);

    // Advance 30 minutes
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    assert.strictEqual(callCount, 2);
    assert.strictEqual(
      brandsUrl(
        { domain: "test", type: "icon" },
        "http://homeassistant.local:8123"
      ),
      "http://homeassistant.local:8123/api/brands/integration/test/icon.png?token=token-2"
    );
  });

  it("Does not refresh before 30 minutes", async () => {
    vi.useFakeTimers();
    let callCount = 0;
    const mockHass = {
      callWS: async () => {
        callCount++;
        return { token: `token-${callCount}` };
      },
    } as unknown as HomeAssistant;

    await fetchBrandsAccessToken(mockHass);
    scheduleBrandsTokenRefresh(mockHass);

    // Advance 29 minutes — should not have refreshed
    await vi.advanceTimersByTimeAsync(29 * 60 * 1000);
    assert.strictEqual(callCount, 1);
  });

  it("clearBrandsTokenRefresh stops the interval", async () => {
    vi.useFakeTimers();
    let callCount = 0;
    const mockHass = {
      callWS: async () => {
        callCount++;
        return { token: `token-${callCount}` };
      },
    } as unknown as HomeAssistant;

    await fetchBrandsAccessToken(mockHass);
    scheduleBrandsTokenRefresh(mockHass);
    clearBrandsTokenRefresh();

    // Advance 30 minutes — should not have refreshed because we cleared
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    assert.strictEqual(callCount, 1);
  });
});
