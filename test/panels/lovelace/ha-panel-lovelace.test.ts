import { expect, it, vi } from "vitest";

import type { LovelaceConfig } from "../../../src/data/lovelace/config/types";
import type { WindowWithPreloads } from "../../../src/data/preloads";
import type { LovelacePanel } from "../../../src/panels/lovelace/ha-panel-lovelace";
import type { Lovelace } from "../../../src/panels/lovelace/types";
import type { HomeAssistant, PanelInfo } from "../../../src/types";

const mocks = vi.hoisted(() => ({ loadModule: vi.fn() }));

vi.hoisted(() => {
  Object.assign(globalThis, {
    __STATIC_PATH__: "/",
    __HASS_URL__: "",
    __BUILD__: "modern",
    __VERSION__: "test",
    __BACKWARDS_COMPAT__: false,
    __SUPERVISOR__: false,
    __NAMESPACE__: "frontend",
  });
});

vi.mock("../../../src/common/dom/load_resource", () => ({
  loadCSS: vi.fn(),
  loadJS: vi.fn(),
  loadModule: mocks.loadModule,
}));

await import("../../../src/panels/lovelace/ha-panel-lovelace");

interface LovelacePanelInternals {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- private panel lifecycle
  _fetchConfig(forceDiskRefresh: boolean): Promise<void>;
  lovelace?: Lovelace;
}

it("waits for Lovelace resources before setting the dashboard config", async () => {
  let resolveResourceLoad: (() => void) | undefined;
  const resourceLoad = new Promise<void>((resolve) => {
    resolveResourceLoad = resolve;
  });
  mocks.loadModule.mockReturnValue(resourceLoad);

  const config: LovelaceConfig = { views: [] };
  const preloadWindow = window as WindowWithPreloads;
  preloadWindow.llConfProm = Promise.resolve(config);
  preloadWindow.llResProm = Promise.resolve([
    { id: "test", type: "module", url: "/local/test-card.js" },
  ]);

  const panel = document.createElement("ha-panel-lovelace") as LovelacePanel;
  panel.panel = {
    config: { mode: "storage" },
    url_path: null,
  } as unknown as PanelInfo<{ mode: "storage" }>;
  panel.hass = {
    areas: {},
    auth: { data: { hassUrl: "http://localhost:8123" } },
    connection: {},
    devices: {},
    entities: {},
    locale: {},
    localize: (key: string) => key,
  } as unknown as HomeAssistant;
  const internals = panel as unknown as LovelacePanelInternals;

  const configLoad = internals._fetchConfig(false);

  await vi.waitFor(() => {
    expect(mocks.loadModule).toHaveBeenCalledOnce();
  });
  expect(internals.lovelace).toBeUndefined();

  resolveResourceLoad!();
  await configLoad;

  expect(internals.lovelace?.rawConfig).toBe(config);
});
