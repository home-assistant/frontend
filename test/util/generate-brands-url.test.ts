import { assert, describe, it } from "vitest";
import type { HomeAssistant } from "../../src/types";
import {
  addBrandsAuth,
  brandsUrl,
  fetchBrandsAccessToken,
} from "../../src/util/brands-url";

describe("Generate brands Url", () => {
  it("Generate logo brands url for cloud component", () => {
    assert.strictEqual(
      brandsUrl({ domain: "cloud", type: "logo" }),
      "/api/brands/integration/cloud/logo.png"
    );
  });
  it("Generate icon brands url for cloud component", () => {
    assert.strictEqual(
      brandsUrl({ domain: "cloud", type: "icon" }),
      "/api/brands/integration/cloud/icon.png"
    );
  });

  it("Generate dark theme optimized logo brands url for cloud component", () => {
    assert.strictEqual(
      brandsUrl({ domain: "cloud", type: "logo", darkOptimized: true }),
      "/api/brands/integration/cloud/dark_logo.png"
    );
  });
});

describe("addBrandsAuth", () => {
  it("Returns non-brands URLs unchanged", () => {
    assert.strictEqual(
      addBrandsAuth("/api/camera_proxy/camera.foo?token=abc"),
      "/api/camera_proxy/camera.foo?token=abc"
    );
  });

  it("Returns brands URL unchanged when no token is available", () => {
    assert.strictEqual(
      addBrandsAuth("/api/brands/integration/demo/icon.png"),
      "/api/brands/integration/demo/icon.png"
    );
  });

  it("Appends token to brands URL when token is available", async () => {
    const mockHass = {
      callWS: async () => ({ token: "test-token-123" }),
    } as unknown as HomeAssistant;
    await fetchBrandsAccessToken(mockHass);

    assert.strictEqual(
      addBrandsAuth("/api/brands/integration/demo/icon.png"),
      "/api/brands/integration/demo/icon.png?token=test-token-123"
    );
  });

  it("Replaces existing token param instead of duplicating", async () => {
    const mockHass = {
      callWS: async () => ({ token: "new-token" }),
    } as unknown as HomeAssistant;
    await fetchBrandsAccessToken(mockHass);

    assert.strictEqual(
      addBrandsAuth("/api/brands/integration/demo/icon.png?token=old-token"),
      "/api/brands/integration/demo/icon.png?token=new-token"
    );
  });
});
