import { LitElement } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HAC_PROVIDER_KEY, provideComponents } from "../src/provider";
import { createDynamicLoader } from "../src/utils/dynamic";

// `dynamic` entry points pick between the host's copy of a component and the
// bundled one, and must only download the bundled one when it is used. These
// cases cover the decision, including a host that publishes its components
// only after the consumer asked for them.
class Bundled extends LitElement {}
class Provided extends LitElement {}

const global = globalThis as Record<symbol, unknown>;

const loader = (loadScoped = vi.fn(async () => Bundled)) => ({
  loadScoped,
  dynamic: createDynamicLoader("hac-test", "1.2.0", loadScoped),
});

afterEach(() => {
  delete global[HAC_PROVIDER_KEY];
});

describe("createDynamicLoader", () => {
  it("uses the bundled class without a host", async () => {
    expect(await loader().dynamic.load()).toBe(Bundled);
  });

  it("uses the host's class when its version is compatible, without loading the bundled one", async () => {
    provideComponents({
      "hac-test": { version: "1.3.0", load: async () => Provided },
    });
    const { dynamic, loadScoped } = loader();
    expect(await dynamic.load()).toBe(Provided);
    expect(loadScoped).not.toHaveBeenCalled();
  });

  it("uses the bundled class when the host's version is incompatible", async () => {
    const load = vi.fn(async () => Provided);
    provideComponents({ "hac-test": { version: "2.0.0", load } });
    expect(await loader().dynamic.load()).toBe(Bundled);
    expect(load).not.toHaveBeenCalled();
  });

  it("uses the bundled class when the host does not provide the tag", async () => {
    provideComponents({});
    expect(await loader().dynamic.load()).toBe(Bundled);
  });

  it("uses the bundled class when the host fails to load its copy", async () => {
    provideComponents({
      "hac-test": {
        version: "1.2.0",
        load: () => Promise.reject(new Error("chunk failed")),
      },
    });
    expect(await loader().dynamic.load()).toBe(Bundled);
  });

  it("loads only once", async () => {
    const { dynamic, loadScoped } = loader();
    await Promise.all([dynamic.load(), dynamic.load()]);
    expect(loadScoped).toHaveBeenCalledTimes(1);
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
    const result = loader().dynamic.load();
    provideComponents({
      "hac-test": { version: "1.2.0", load: async () => Provided },
    });
    expect(await result).toBe(Provided);
  });
});
