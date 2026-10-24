import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtEntityRegistryEntry } from "../../../../../src/data/entity/entity_registry";
import type * as ExposeModule from "../../../../../src/data/expose";
import type {
  ExposeEntitySettings,
  listExposedEntities as listExposedEntitiesType,
} from "../../../../../src/data/expose";
import type { HomeAssistant } from "../../../../../src/types";

// This component's own rendering (and its `entity-voice-settings` child) pulls
// in webawesome-based form controls (ha-button, ha-switch) whose
// `connectedCallback` relies on `ElementInternals.setValidity`, which jsdom
// does not implement. So instead of mounting the component, we drive its
// fetch/race/error logic directly against the exported class.
const listExposedEntitiesMock = vi.fn<typeof listExposedEntitiesType>();

vi.mock("../../../../../src/data/expose", async (importOriginal) => ({
  ...(await importOriginal<typeof ExposeModule>()),
  listExposedEntities: (...args: Parameters<typeof listExposedEntitiesType>) =>
    listExposedEntitiesMock(...args),
}));

const { MoreInfoViewVoiceAssistants: viewCtor } =
  await import("../../../../../src/dialogs/more-info/components/voice/ha-more-info-view-voice-assistants");

interface ExposedEntitiesResult {
  exposed_entities: Record<string, ExposeEntitySettings>;
  locked_entities: Record<string, ExposeEntitySettings>;
}

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const makeEntry = (entityId: string): ExtEntityRegistryEntry =>
  ({ entity_id: entityId, options: {} }) as ExtEntityRegistryEntry;

// Cast to `any`: the test reaches past the component's public API into its
// private fetch/state fields on purpose, to cover the race and error
// handling directly without mounting the component (see note above).
const makeView = (): any => {
  const view: any = new viewCtor();
  view.hass = {} as HomeAssistant;
  return view;
};

describe("ha-more-info-view-voice-assistants", () => {
  beforeEach(() => {
    listExposedEntitiesMock.mockReset();
  });

  it("ignores a stale response after the entry changes before it resolves", async () => {
    const first = deferred<ExposedEntitiesResult>();
    const second = deferred<ExposedEntitiesResult>();
    listExposedEntitiesMock
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const view = makeView();

    view.entry = makeEntry("light.first");
    const firstFetch = view._fetchExposed();

    // The entry changes to a second entity before the first request settles.
    view.entry = makeEntry("light.second");
    const secondFetch = view._fetchExposed();

    second.resolve({
      exposed_entities: { "light.second": { conversation: true } },
      locked_entities: {},
    });
    await secondFetch;

    expect(view._exposed).toEqual({ conversation: true });

    // The stale first response arrives after the second has already landed.
    first.resolve({
      exposed_entities: { "light.first": { conversation: false } },
      locked_entities: {},
    });
    await firstFetch;

    expect(view._exposed).toEqual({ conversation: true });
  });

  it("flags an error when the fetch rejects, and recovers on retry", async () => {
    const failing = deferred<ExposedEntitiesResult>();
    listExposedEntitiesMock.mockReturnValueOnce(failing.promise);

    const view = makeView();
    view.entry = makeEntry("light.kitchen");

    const fetchPromise = view._fetchExposed();
    failing.reject(new Error("network error"));
    await fetchPromise;

    expect(view._error).toBe(true);
    expect(view._exposed).toBeUndefined();

    const retried = deferred<ExposedEntitiesResult>();
    listExposedEntitiesMock.mockReturnValueOnce(retried.promise);
    const retryPromise = view._fetchExposed();
    retried.resolve({
      exposed_entities: { "light.kitchen": { conversation: true } },
      locked_entities: {},
    });
    await retryPromise;

    expect(view._error).toBe(false);
    expect(view._exposed).toEqual({ conversation: true });
  });

  it("ignores a stale rejection after the entry changes before it settles", async () => {
    const failing = deferred<ExposedEntitiesResult>();
    const second = deferred<ExposedEntitiesResult>();
    listExposedEntitiesMock
      .mockReturnValueOnce(failing.promise)
      .mockReturnValueOnce(second.promise);

    const view = makeView();
    view.entry = makeEntry("light.first");
    const firstFetch = view._fetchExposed();

    view.entry = makeEntry("light.second");
    const secondFetch = view._fetchExposed();

    second.resolve({
      exposed_entities: { "light.second": { conversation: true } },
      locked_entities: {},
    });
    await secondFetch;
    expect(view._error).toBe(false);

    // The stale request for the first entity fails after the second landed.
    failing.reject(new Error("network error"));
    await firstFetch;

    expect(view._error).toBe(false);
    expect(view._exposed).toEqual({ conversation: true });
  });

  it("ignores a stale response for the same entity after an A -> B -> A sequence", async () => {
    const firstA = deferred<ExposedEntitiesResult>();
    const b = deferred<ExposedEntitiesResult>();
    const secondA = deferred<ExposedEntitiesResult>();
    listExposedEntitiesMock
      .mockReturnValueOnce(firstA.promise)
      .mockReturnValueOnce(b.promise)
      .mockReturnValueOnce(secondA.promise);

    const view = makeView();

    view.entry = makeEntry("light.a");
    const firstAFetch = view._fetchExposed();

    view.entry = makeEntry("light.b");
    const bFetch = view._fetchExposed();

    // Back to the original entity: a same-entity-ID comparison alone would
    // not distinguish this from the still-pending firstA request.
    view.entry = makeEntry("light.a");
    const secondAFetch = view._fetchExposed();

    b.resolve({
      exposed_entities: { "light.b": { conversation: true } },
      locked_entities: {},
    });
    await bFetch;

    secondA.resolve({
      exposed_entities: { "light.a": { conversation: true } },
      locked_entities: {},
    });
    await secondAFetch;

    expect(view._exposed).toEqual({ conversation: true });

    // The stalest request for "light.a" lands last of all.
    firstA.resolve({
      exposed_entities: { "light.a": { conversation: false } },
      locked_entities: {},
    });
    await firstAFetch;

    expect(view._exposed).toEqual({ conversation: true });
  });

  it("ignores a stale response from an earlier retry of the same entity", async () => {
    const first = deferred<ExposedEntitiesResult>();
    const retry = deferred<ExposedEntitiesResult>();
    listExposedEntitiesMock
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(retry.promise);

    const view = makeView();
    view.entry = makeEntry("light.kitchen");

    // Two overlapping fetches for the same, unchanged entity (e.g. a
    // double-clicked retry button).
    const firstFetch = view._fetchExposed();
    const retryFetch = view._fetchExposed();

    retry.resolve({
      exposed_entities: { "light.kitchen": { conversation: true } },
      locked_entities: {},
    });
    await retryFetch;

    expect(view._exposed).toEqual({ conversation: true });

    first.resolve({
      exposed_entities: { "light.kitchen": { conversation: false } },
      locked_entities: {},
    });
    await firstFetch;

    expect(view._exposed).toEqual({ conversation: true });
  });

  describe("willUpdate", () => {
    it("fetches and clears prior state when the entry changes", () => {
      const view = makeView();
      view.entry = makeEntry("light.kitchen");
      view._exposed = { conversation: true };
      view._locked = { conversation: true };
      view._fetchExposed = vi.fn();

      view.willUpdate(new Map([["entry", undefined]]));

      expect(view._fetchExposed).toHaveBeenCalledTimes(1);
      expect(view._exposed).toBeUndefined();
      expect(view._locked).toBeUndefined();
    });

    it("does not fetch when entry is unset", () => {
      const view = makeView();
      view._fetchExposed = vi.fn();

      view.willUpdate(new Map([["entry", undefined]]));

      expect(view._fetchExposed).not.toHaveBeenCalled();
    });

    it("does not fetch when an unrelated property changes", () => {
      const view = makeView();
      view.entry = makeEntry("light.kitchen");
      view._fetchExposed = vi.fn();

      view.willUpdate(new Map([["hass", undefined]]));

      expect(view._fetchExposed).not.toHaveBeenCalled();
    });
  });
});
