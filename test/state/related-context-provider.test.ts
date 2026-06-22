import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RelatedIdSets } from "../../src/common/search/related-context";
import type { RelatedContextItem } from "../../src/data/context";
import { findRelated } from "../../src/data/search";
import type { RelatedResult } from "../../src/data/search";
import type { HassBaseEl } from "../../src/state/hass-base-mixin";
import { RelatedContextProvider } from "../../src/state/related-context-provider";

vi.mock("../../src/data/search", () => ({
  findRelated: vi.fn(),
}));

const findRelatedMock = vi.mocked(findRelated);

const tick = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const toArrays = (value: RelatedIdSets | undefined) =>
  value && {
    entities: [...value.entities].sort(),
    devices: [...value.devices].sort(),
    areas: [...value.areas].sort(),
  };

describe("RelatedContextProvider", () => {
  let host: HassBaseEl;
  let provider: RelatedContextProvider;

  // Read the value the provider has published to its context consumers.
  const published = () =>
    (provider as unknown as { _provider: { value: RelatedIdSets | undefined } })
      ._provider.value;

  const createProvider = (hass: unknown) => {
    const el = document.createElement("div");
    (el as unknown as { hass: unknown }).hass = hass;
    host = el as unknown as HassBaseEl;
    provider = new RelatedContextProvider(host);
    provider.connect();
  };

  const dispatch = (detail: unknown) => {
    const event = new Event("hass-related-context");
    (event as unknown as { detail: unknown }).detail = detail;
    host.dispatchEvent(event);
  };

  const fireItem = (item: RelatedContextItem) => dispatch(item);

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new Event("popstate"));
  };

  beforeEach(() => {
    findRelatedMock.mockReset();
    window.history.pushState({}, "", "/lovelace");
  });

  afterEach(() => {
    provider?.disconnect();
  });

  it("resolves an item and publishes the related set, merging the item itself", async () => {
    findRelatedMock.mockResolvedValue({ device: ["dev1"], area: ["area1"] });
    createProvider({});

    fireItem({ itemType: "entity", itemId: "light.ac" });
    await tick();

    expect(findRelatedMock).toHaveBeenCalledWith(
      host.hass,
      "entity",
      "light.ac"
    );
    expect(toArrays(published())).toEqual({
      entities: ["light.ac"],
      devices: ["dev1"],
      areas: ["area1"],
    });
  });

  it("clears when the detail has no itemId (fireEvent coerces undefined to {})", async () => {
    findRelatedMock.mockResolvedValue({ device: ["dev1"] });
    createProvider({});

    fireItem({ itemType: "entity", itemId: "light.ac" });
    await tick();
    expect(published()).toBeDefined();

    findRelatedMock.mockClear();
    dispatch({});
    await tick();

    expect(published()).toBeUndefined();
    expect(findRelatedMock).not.toHaveBeenCalled();
  });

  it("publishes nothing when hass is not available", async () => {
    createProvider(undefined);

    fireItem({ itemType: "entity", itemId: "light.ac" });
    await tick();

    expect(findRelatedMock).not.toHaveBeenCalled();
    expect(published()).toBeUndefined();
  });

  it("publishes nothing when the related lookup fails", async () => {
    findRelatedMock.mockRejectedValue(new Error("boom"));
    createProvider({});

    fireItem({ itemType: "entity", itemId: "light.ac" });
    await tick();

    expect(published()).toBeUndefined();
  });

  it("ignores a stale in-flight resolve superseded by a newer item", async () => {
    const first = deferred<RelatedResult>();
    const second = deferred<RelatedResult>();
    findRelatedMock
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    createProvider({});

    fireItem({ itemType: "entity", itemId: "light.first" });
    fireItem({ itemType: "entity", itemId: "light.second" });

    second.resolve({ device: ["dev2"] });
    await tick();
    expect(toArrays(published())!.entities).toEqual(["light.second"]);

    // The older lookup resolves late and must not overwrite the newer value.
    first.resolve({ device: ["dev1"] });
    await tick();
    expect(toArrays(published())!.entities).toEqual(["light.second"]);
    expect(toArrays(published())!.devices).toEqual(["dev2"]);
  });

  it("memoizes repeated identical items", async () => {
    findRelatedMock.mockResolvedValue({ device: ["dev1"] });
    createProvider({});

    fireItem({ itemType: "entity", itemId: "light.ac" });
    await tick();
    fireItem({ itemType: "entity", itemId: "light.ac" });
    await tick();

    expect(findRelatedMock).toHaveBeenCalledTimes(1);
  });

  it("clears the context on a real navigation (pathname change)", async () => {
    findRelatedMock.mockResolvedValue({ device: ["dev1"] });
    createProvider({});

    fireItem({ itemType: "entity", itemId: "light.ac" });
    await tick();
    expect(published()).toBeDefined();

    navigate("/config/devices");
    await tick();

    expect(published()).toBeUndefined();
  });

  it("keeps the context on a same-path popstate (dialog history)", async () => {
    findRelatedMock.mockResolvedValue({ device: ["dev1"] });
    createProvider({});

    fireItem({ itemType: "entity", itemId: "light.ac" });
    await tick();
    const before = toArrays(published());

    // popstate without a pathname change (dialog open/close)
    window.dispatchEvent(new Event("popstate"));
    await tick();

    expect(toArrays(published())).toEqual(before);
  });

  it("stops responding to events after disconnect", async () => {
    findRelatedMock.mockResolvedValue({ device: ["dev1"] });
    createProvider({});
    provider.disconnect();

    fireItem({ itemType: "entity", itemId: "light.ac" });
    await tick();

    expect(findRelatedMock).not.toHaveBeenCalled();
    expect(published()).toBeUndefined();
  });
});
