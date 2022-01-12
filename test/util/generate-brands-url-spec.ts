import { assert } from "chai";
import { brandsUrl } from "../../src/util/brands-url";

describe("Generate brands Url", () => {
  it("Generate logo brands url for cloud component without fallback", () => {
    assert.strictEqual(
      // @ts-ignore
      brandsUrl({ domain: "cloud", type: "logo" }),
      "https://brands.home-assistant.io/cloud/logo.png"
    );
  });
  it("Generate icon brands url for cloud component without fallback", () => {
    assert.strictEqual(
      // @ts-ignore
      brandsUrl({ domain: "cloud", type: "icon" }),
      "https://brands.home-assistant.io/cloud/icon.png"
    );
  });
  it("Generate logo brands url for cloud component with fallback", () => {
    assert.strictEqual(
      // @ts-ignore
      brandsUrl({ domain: "cloud", type: "logo", useFallback: true }),
      "https://brands.home-assistant.io/_/cloud/logo.png"
    );
  });
  it("Generate icon brands url for cloud component with fallback", () => {
    assert.strictEqual(
      // @ts-ignore
      brandsUrl({ domain: "cloud", type: "icon", useFallback: true }),
      "https://brands.home-assistant.io/_/cloud/icon.png"
    );
  });

  it("Generate dark theme optimized logo brands url for cloud component without fallback", () => {
    assert.strictEqual(
      // @ts-ignore
      brandsUrl({ domain: "cloud", type: "logo", darkOptimized: true }),
      "https://brands.home-assistant.io/cloud/dark_logo.png"
    );
  });
});
