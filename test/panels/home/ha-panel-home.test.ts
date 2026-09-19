import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as FrontendDataModule from "../../../src/data/frontend";
import type { HomeFrontendSystemData } from "../../../src/data/frontend";
import type * as GetStrategyModule from "../../../src/panels/lovelace/strategies/get-strategy";
import type { HomeAssistant } from "../../../src/types";
import { createMockHass } from "../../fixtures/hass";
import "../../../src/panels/home/ha-panel-home";
import { saveFrontendSystemData } from "../../../src/data/frontend";
import { generateLovelaceDashboardStrategy } from "../../../src/panels/lovelace/strategies/get-strategy";

// ha-panel-home transitively imports theme resources that reference
// __STATIC_PATH__, a build-time global normally injected by the bundler.
vi.hoisted(() => {
  (globalThis as any).__STATIC_PATH__ = "/static/";
});

vi.mock(
  "../../../src/panels/lovelace/strategies/get-strategy",
  async (importOriginal) => {
    const actual = await importOriginal<typeof GetStrategyModule>();
    return {
      ...actual,
      generateLovelaceDashboardStrategy: vi.fn(),
    };
  }
);

vi.mock("../../../src/data/frontend", async (importOriginal) => {
  const actual = await importOriginal<typeof FrontendDataModule>();
  return {
    ...actual,
    saveFrontendSystemData: vi.fn(),
  };
});

const mockedGenerateLovelaceDashboardStrategy = vi.mocked(
  generateLovelaceDashboardStrategy
);

const mockedSaveFrontendSystemData = vi.mocked(saveFrontendSystemData);

interface TestPanelHome extends HTMLElement {
  hass: HomeAssistant;
  hasUpdated: boolean;
  _lovelace?: { config: unknown };
  willUpdate(changedProps: Map<string, unknown>): void;
}

const setPreviewConfig = (
  el: TestPanelHome,
  config: HomeFrontendSystemData | undefined
) =>
  (
    el as unknown as Record<
      "_setPreviewConfig",
      (config: HomeFrontendSystemData | undefined) => void
    >
  )._setPreviewConfig(config);

const setLovelace = (el: TestPanelHome) =>
  (el as unknown as Record<"_setLovelace", () => Promise<void>>)._setLovelace();

const saveConfig = (el: TestPanelHome, config: HomeFrontendSystemData) =>
  (
    el as unknown as Record<
      "_saveConfig",
      (config: HomeFrontendSystemData) => Promise<boolean>
    >
  )._saveConfig(config);

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe("ha-panel-home stale strategy regeneration guard", () => {
  beforeEach(() => {
    // _setPreviewConfig() schedules a real 200ms debounce internally. Fake
    // timers keep it from ever firing on its own, since every test here
    // controls _setLovelace() timing explicitly instead.
    vi.useFakeTimers();
    mockedGenerateLovelaceDashboardStrategy.mockReset();
    mockedSaveFrontendSystemData.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  const createPanel = () => {
    const el = document.createElement(
      "ha-panel-home"
    ) as unknown as TestPanelHome;
    el.hass = createMockHass();
    return el;
  };

  it("keeps the most recently started regeneration when an older one resolves later", async () => {
    const el = createPanel();

    const older = deferred<{ views: unknown[] }>();
    const newer = deferred<{ views: unknown[] }>();
    mockedGenerateLovelaceDashboardStrategy
      .mockReturnValueOnce(older.promise as any)
      .mockReturnValueOnce(newer.promise as any);

    // Two regenerations start back-to-back, with no preview change in
    // between, simulating two _setLovelace() calls overlapping in flight.
    const olderCall = setLovelace(el);
    const newerCall = setLovelace(el);

    // The newer one resolves first...
    newer.resolve({ views: ["newer"] });
    await newerCall;
    // ...but the older one, from before it, resolves last.
    older.resolve({ views: ["older"] });
    await olderCall;

    expect(el._lovelace?.config).toEqual({ views: ["newer"] });
  });

  it("discards a draft generation that resolves after preview is cleared", async () => {
    const el = createPanel();

    const staleGeneration = deferred<{ views: unknown[] }>();
    mockedGenerateLovelaceDashboardStrategy.mockReturnValueOnce(
      staleGeneration.promise as any
    );

    // An edit starts a draft regeneration that will take a while to resolve.
    setPreviewConfig(el, { hide_welcome_message: true });
    const inFlight = setLovelace(el);

    // The user cancels before that regeneration resolves. This must
    // invalidate it immediately, not just once the next debounced
    // regeneration actually starts.
    setPreviewConfig(el, undefined);

    // The cancelled draft's request finally comes back.
    staleGeneration.resolve({ views: [] });
    await inFlight;

    expect(el._lovelace).toBeUndefined();
  });

  it("still applies a regeneration that starts after the previous one", async () => {
    const el = createPanel();

    const config: HomeFrontendSystemData = { hide_welcome_message: true };
    mockedGenerateLovelaceDashboardStrategy.mockResolvedValueOnce({
      views: [],
    } as any);

    setPreviewConfig(el, config);
    await setLovelace(el);

    expect(el._lovelace?.config).toEqual({ views: [] });
  });

  it("passes the previewed draft to strategy generation, then falls back to the saved config once the preview is cleared", async () => {
    const el = createPanel();
    mockedGenerateLovelaceDashboardStrategy.mockResolvedValue({
      views: [],
    } as any);

    setPreviewConfig(el, { hide_welcome_message: true });
    await setLovelace(el);

    expect(mockedGenerateLovelaceDashboardStrategy).toHaveBeenLastCalledWith(
      {
        strategy: {
          type: "home",
          alert_entities: undefined,
          favorite_entities: undefined,
          home_panel: true,
          hide_welcome_message: true,
          hide_suggested_entities: undefined,
          shortcuts: undefined,
        },
      },
      el.hass
    );

    setPreviewConfig(el, undefined);
    await setLovelace(el);

    expect(mockedGenerateLovelaceDashboardStrategy).toHaveBeenLastCalledWith(
      {
        strategy: {
          type: "home",
          alert_entities: undefined,
          favorite_entities: undefined,
          home_panel: true,
          hide_welcome_message: undefined,
          hide_suggested_entities: undefined,
          shortcuts: undefined,
        },
      },
      el.hass
    );
  });

  it("cancels a pending preview debounce so a fast save does not trigger a redundant extra regeneration", async () => {
    const el = createPanel();
    mockedGenerateLovelaceDashboardStrategy.mockResolvedValue({
      views: [],
    } as any);
    mockedSaveFrontendSystemData.mockResolvedValueOnce(undefined);

    // A preview edit schedules the 200ms debounce...
    setPreviewConfig(el, { hide_welcome_message: true });

    // ...but the user saves before it fires.
    await saveConfig(el, { hide_welcome_message: true });
    expect(mockedGenerateLovelaceDashboardStrategy).toHaveBeenCalledTimes(1);

    // Advancing past the debounce's original window must not add a second,
    // now-redundant regeneration.
    await vi.advanceTimersByTimeAsync(200);
    expect(mockedGenerateLovelaceDashboardStrategy).toHaveBeenCalledTimes(1);
  });

  it("reports failure without touching the dashboard when the backend save rejects", async () => {
    const el = createPanel();
    mockedSaveFrontendSystemData.mockRejectedValueOnce(new Error("boom"));

    const success = await saveConfig(el, { hide_welcome_message: true });

    expect(success).toBe(false);
    expect(mockedGenerateLovelaceDashboardStrategy).not.toHaveBeenCalled();
  });

  it("does not regenerate when previewConfig is called with the already-current value", async () => {
    const el = createPanel();
    mockedGenerateLovelaceDashboardStrategy.mockResolvedValue({
      views: [],
    } as any);

    // Opening and cancelling the dialog without any edit still calls
    // previewConfig(undefined), which is already the current value.
    setPreviewConfig(el, undefined);

    // Nothing should have been scheduled: advancing past the debounce
    // window must not trigger a regeneration.
    await vi.advanceTimersByTimeAsync(200);
    expect(mockedGenerateLovelaceDashboardStrategy).not.toHaveBeenCalled();
  });

  it("cancels a pending preview debounce before a locale-driven regeneration", async () => {
    const el = createPanel();
    mockedGenerateLovelaceDashboardStrategy.mockResolvedValue({
      views: [],
    } as any);
    (el as unknown as Record<"hasUpdated", boolean>).hasUpdated = true;

    // A preview edit schedules the 200ms debounce...
    setPreviewConfig(el, { hide_welcome_message: true });

    // ...but the locale changes before it fires.
    const oldHass = el.hass;
    el.hass = { ...oldHass, localize: ((key: string) => key) as any };
    el.willUpdate(new Map([["hass", oldHass]]));

    expect(mockedGenerateLovelaceDashboardStrategy).toHaveBeenCalledTimes(1);

    // Advancing past the debounce's original window must not add a second,
    // now-redundant regeneration.
    await vi.advanceTimersByTimeAsync(200);
    expect(mockedGenerateLovelaceDashboardStrategy).toHaveBeenCalledTimes(1);
  });
});
