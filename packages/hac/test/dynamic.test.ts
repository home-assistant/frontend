import { afterEach, describe, expect, it, vi } from "vitest";
import { HAC_PROVIDER_KEY, provideComponents } from "../src/provider";
import { createDynamicLoader } from "../src/utils/dynamic";

// `dynamic` entry points pick between the host's copy of a component and the
// bundled one. These cases cover the decision, including a host that
// publishes its components only after the consumer asked for them.
class Bundled extends HTMLElement {
  static readonly version = "1.2.0";
}
class Provided extends HTMLElement {}

const global = globalThis as Record<symbol, unknown>;

afterEach(() => {
  delete global[HAC_PROVIDER_KEY];
});

describe("createDynamicLoader", () => {
  it("uses the bundled class without a host", async () => {
    const loader = createDynamicLoader("hac-test", Bundled);
    expect(await loader.load()).toBe(Bundled);
  });

  it("uses the host's class when its version is compatible", async () => {
    provideComponents({
      "hac-test": { version: "1.3.0", load: async () => Provided },
    });
    const loader = createDynamicLoader("hac-test", Bundled);
    expect(await loader.load()).toBe(Provided);
  });

  it("uses the bundled class when the host's version is incompatible", async () => {
    const load = vi.fn(async () => Provided);
    provideComponents({ "hac-test": { version: "2.0.0", load } });
    const loader = createDynamicLoader("hac-test", Bundled);
    expect(await loader.load()).toBe(Bundled);
    expect(load).not.toHaveBeenCalled();
  });

  it("uses the bundled class when the host does not provide the tag", async () => {
    provideComponents({});
    const loader = createDynamicLoader("hac-test", Bundled);
    expect(await loader.load()).toBe(Bundled);
  });

  it("uses the bundled class when the host fails to load its copy", async () => {
    provideComponents({
      "hac-test": {
        version: "1.2.0",
        load: () => Promise.reject(new Error("chunk failed")),
      },
    });
    const loader = createDynamicLoader("hac-test", Bundled);
    expect(await loader.load()).toBe(Bundled);
  });

  it("waits for a host that announced itself but has not published yet", async () => {
    // What the host's HTML does before any module loads
    let resolve!: (value: unknown) => void;
    global[HAC_PROVIDER_KEY] = {
      components: new Promise((res) => {
        resolve = res;
      }),
      resolve: (value: unknown) => resolve(value),
    };
    const result = createDynamicLoader("hac-test", Bundled).load();
    provideComponents({
      "hac-test": { version: "1.2.0", load: async () => Provided },
    });
    expect(await result).toBe(Provided);
  });
});
