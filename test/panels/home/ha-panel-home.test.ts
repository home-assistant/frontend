import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as FrontendDataModule from "../../../src/data/frontend";
import type { HomeFrontendSystemData } from "../../../src/data/frontend";
import type * as GetStrategyModule from "../../../src/panels/lovelace/strategies/get-strategy";
import type { HomeAssistant } from "../../../src/types";
import { provideHass } from "../../../src/fake_data/provide_hass";
import { createMockHass } from "../../fixtures/hass";
import "../../../src/panels/home/ha-panel-home";
import { saveFrontendSystemData } from "../../../src/data/frontend";
import { generateLovelaceDashboardStrategy } from "../../../src/panels/lovelace/strategies/get-strategy";

// ha-panel-home transitively imports theme resources that reference
// __STATIC_PATH__, a build-time global normally injected by the bundler.
vi.hoisted(() => {
  (globalThis as any).__STATIC_PATH__ = "/static/";
});

type HomePanel = HTMLElement & {
  hass: unknown;
  updateComplete: Promise<boolean>;
  _showBanner: boolean;
  _loadConfigPromise?: Promise<void>;
  [key: string]: unknown;
};

for (const tag of ["ha-button", "ha-svg-icon"]) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe = vi.fn();

    unobserve = vi.fn();

    disconnect = vi.fn();
  }
);
vi.mock("../../../src/components/ha-button", () => ({}));
vi.mock("../../../src/components/ha-svg-icon", () => ({}));
vi.mock("../../../src/panels/lovelace/hui-root", () => ({}));
vi.mock("../../../src/panels/home/dialogs/show-dialog-new-overview", () => ({
  showNewOverviewDialog: vi.fn(),
}));

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
    fetchFrontendSystemData: vi.fn(),
    saveFrontendSystemData: vi.fn(),
    subscribeFrontendSystemData: vi.fn(() => () => undefined),
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

const getPreviewConfig = (el: TestPanelHome) =>
  (
    el as unknown as Record<
      "_previewConfig",
      HomeFrontendSystemData | undefined
    >
  )._previewConfig;

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

  it("clears _previewConfig after a save whose content matches it, so a reopened dialog does not inherit a stale draft", async () => {
    const el = createPanel();
    mockedGenerateLovelaceDashboardStrategy.mockResolvedValue({
      views: [],
    } as any);
    mockedSaveFrontendSystemData.mockResolvedValueOnce(undefined);

    const draft: HomeFrontendSystemData = { hide_welcome_message: true };
    setPreviewConfig(el, draft);

    // The saved config is content-equal to the current preview (e.g. Save
    // was clicked on that exact draft), but built via a separate
    // buildHomeConfig() call, so it is a different object reference.
    await saveConfig(el, { hide_welcome_message: true });

    expect(getPreviewConfig(el)).toBeUndefined();
  });

  it("preserves _previewConfig after a save whose content differs from it, keeping a newer live draft", async () => {
    const el = createPanel();
    mockedGenerateLovelaceDashboardStrategy.mockResolvedValue({
      views: [],
    } as any);
    mockedSaveFrontendSystemData.mockResolvedValueOnce(undefined);

    // A newer edit is pushed to the preview after the save's config was
    // captured but before it resolves (mirrors dialog-edit-home's stale
    // save handling, which keeps the dialog open with the newer draft).
    const saved: HomeFrontendSystemData = { hide_welcome_message: true };
    const newerDraft: HomeFrontendSystemData = {
      hide_welcome_message: true,
      hide_suggested_entities: true,
    };
    setPreviewConfig(el, newerDraft);

    await saveConfig(el, saved);

    expect(getPreviewConfig(el)).toEqual(newerDraft);
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

const STORED: HomeFrontendSystemData = {
  welcome_banner_dismissed: false,
  favorite_entities: ["light.kitchen", "climate.living"],
  shortcuts: [
    { type: "summary", key: "light" },
    { type: "custom", path: "/energy", label: "Energy" },
  ],
};

const openPanel = async (fetchImpl: () => Promise<any>) => {
  const { fetchFrontendSystemData } =
    await import("../../../src/data/frontend");
  vi.mocked(fetchFrontendSystemData).mockImplementation(fetchImpl as any);
  const host = document.createElement("div");
  // No legacy overview panel: the banner decision must rest on loaded config.
  const hass = provideHass(host, { panels: {} });
  document.body.append(host);
  const panel = document.createElement("ha-panel-home") as unknown as HomePanel;
  host.append(panel);
  panel.hass = hass;
  await panel.updateComplete;
  await panel._loadConfigPromise;
  return panel;
};

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe("home panel welcome banner", () => {
  it("stays hidden when the home config load is rejected", async () => {
    const { showNewOverviewDialog } =
      await import("../../../src/panels/home/dialogs/show-dialog-new-overview");
    let dismissed: Promise<void> | undefined;
    vi.mocked(showNewOverviewDialog).mockImplementation(((
      _el: any,
      opts: any
    ) => {
      dismissed = opts.dismiss();
    }) as any);
    const panel = await openPanel(async () => {
      throw new Error("no answer");
    });
    await panel.updateComplete;
    expect(panel._showBanner).toBe(false);
    // Defense in depth: even if invoked directly, dismiss must not persist
    // an unloaded (empty) config over stored favourites/shortcuts.
    (panel["_learnMore"] as () => void)();
    await dismissed;
    await panel.updateComplete;
    expect(mockedSaveFrontendSystemData).not.toHaveBeenCalled();
  });

  it("dismissing saves the loaded favourites, not an empty config", async () => {
    const { showNewOverviewDialog } =
      await import("../../../src/panels/home/dialogs/show-dialog-new-overview");
    let dismissed: Promise<void> | undefined;
    vi.mocked(showNewOverviewDialog).mockImplementation(((
      _el: any,
      opts: any
    ) => {
      dismissed = opts.dismiss();
    }) as any);
    const panel = await openPanel(async () => ({ ...STORED }));
    await panel.updateComplete;
    expect(panel._showBanner).toBe(true);
    (panel["_learnMore"] as () => void)();
    await dismissed;
    await panel.updateComplete;
    expect(mockedSaveFrontendSystemData).toHaveBeenCalledTimes(1);
    const saved = mockedSaveFrontendSystemData.mock.calls[0][2] as any;
    expect(saved.favorite_entities).toEqual(STORED.favorite_entities);
    expect(saved.shortcuts).toEqual(STORED.shortcuts);
    expect(saved.welcome_banner_dismissed).toBe(true);
  });
});
