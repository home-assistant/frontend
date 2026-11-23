import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeLovelaceUpdates } from "../../../src/data/lovelace";
import { fetchConfig } from "../../../src/data/lovelace/config/types";
import "../../../src/panels/lovelace/ha-panel-lovelace";
import { generateLovelaceDashboardStrategy } from "../../../src/panels/lovelace/strategies/get-strategy";

type LovelacePanel = HTMLElement & {
  hass: unknown;
  panel: unknown;
  lovelace?: { config: unknown };
  updateComplete: Promise<boolean>;
};

vi.mock("../../../src/panels/lovelace/hui-root", () => ({}));
vi.mock("../../../src/layouts/hass-loading-screen", () => ({}));
vi.mock("../../../src/layouts/hass-error-screen", () => ({}));
vi.mock("../../../src/data/lovelace", () => ({
  subscribeLovelaceUpdates: vi.fn(),
}));
vi.mock("../../../src/data/lovelace/config/types", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchConfig: vi.fn(),
}));
vi.mock(
  "../../../src/panels/lovelace/strategies/get-strategy",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    generateLovelaceDashboardStrategy: vi.fn(),
  })
);
vi.mock("../../../src/data/lovelace/resource", () => ({
  fetchResources: vi.fn(async () => []),
}));
vi.mock("../../../src/panels/lovelace/common/load-resources", () => ({
  loadLovelaceResources: vi.fn(),
}));

const flush = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve);
  });

const openPanel = async (
  urlPath: string,
  config: object = { views: [{ cards: [] }] }
) => {
  let notifyUpdated: () => void = () => undefined;
  const unsub = vi.fn(async () => {
    notifyUpdated = () => undefined;
  });
  vi.mocked(subscribeLovelaceUpdates).mockImplementation(
    (_conn, _urlPath, onChange) => {
      notifyUpdated = onChange;
      return Promise.resolve(unsub);
    }
  );
  vi.mocked(fetchConfig).mockResolvedValue(config);

  const panel = document.createElement(
    "ha-panel-lovelace"
  ) as unknown as LovelacePanel;
  panel.hass = {
    connection: {},
    locale: { language: "en" },
    localize: (key: string) => key,
    entities: {},
    devices: {},
    areas: {},
  };
  panel.panel = {
    url_path: urlPath,
    component_name: "lovelace",
    config: { mode: "storage" },
  };
  document.body.append(panel);
  await panel.updateComplete;
  await flush();
  return { panel, unsub, notifyUpdated: () => notifyUpdated() };
};

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe("ha-panel-lovelace config updates", () => {
  it("refetches the cached lovelace dashboard when it was updated while away", async () => {
    const { panel, unsub, notifyUpdated } = await openPanel("lovelace");
    expect(fetchConfig).toHaveBeenCalledTimes(1);

    // Navigate away: the panel resolver keeps this element cached.
    panel.remove();
    await flush();
    expect(unsub).not.toHaveBeenCalled();

    // Config saved from elsewhere, e.g. "Add to dashboard" on a device page.
    notifyUpdated();
    expect(fetchConfig).toHaveBeenCalledTimes(1);

    document.body.append(panel);
    await flush();
    expect(fetchConfig).toHaveBeenCalledTimes(2);

    // Coming back again without a change uses the cached config.
    panel.remove();
    document.body.append(panel);
    await flush();
    expect(fetchConfig).toHaveBeenCalledTimes(2);
  });

  it("unsubscribes other dashboards when they are removed", async () => {
    const { panel, unsub } = await openPanel("dashboard-test");
    panel.remove();
    await flush();
    expect(unsub).toHaveBeenCalledTimes(1);
  });
});

describe("ha-panel-lovelace reconnect", () => {
  const reconnect = async () => {
    window.dispatchEvent(
      new CustomEvent("connection-status", { detail: "connected" })
    );
    await flush();
  };

  it("keeps the dashboard when the config is unchanged", async () => {
    const { panel } = await openPanel("dashboard-test");
    const lovelace = panel.lovelace;
    expect(lovelace).toBeDefined();

    vi.mocked(fetchConfig).mockResolvedValueOnce({ views: [{ cards: [] }] });
    await reconnect();

    expect(fetchConfig).toHaveBeenCalledTimes(2);
    expect(panel.lovelace).toBe(lovelace);
  });

  it("rebuilds the dashboard when the config changed", async () => {
    const { panel } = await openPanel("dashboard-test");
    const lovelace = panel.lovelace;

    const changed = { views: [{ cards: [{ type: "markdown" }] }] };
    vi.mocked(fetchConfig).mockResolvedValueOnce(changed);
    await reconnect();

    expect(panel.lovelace).not.toBe(lovelace);
    expect(panel.lovelace!.config).toEqual(changed);
  });

  it("rebuilds the dashboard when only the key order changed", async () => {
    const { panel } = await openPanel("dashboard-test", {
      views: [{ cards: [{ type: "markdown", content: "a" }] }],
    });
    const lovelace = panel.lovelace;

    vi.mocked(fetchConfig).mockResolvedValueOnce({
      views: [{ cards: [{ content: "a", type: "markdown" }] }],
    });
    await reconnect();

    expect(panel.lovelace).not.toBe(lovelace);
  });

  it("rebuilds a strategy dashboard only when its output changed", async () => {
    const strategy = { strategy: { type: "test" } };
    vi.mocked(generateLovelaceDashboardStrategy)
      .mockResolvedValueOnce({ views: [{ cards: [] }] })
      .mockResolvedValueOnce({ views: [{ cards: [] }] })
      .mockResolvedValueOnce({ views: [{ cards: [{ type: "markdown" }] }] });
    const { panel } = await openPanel("dashboard-test", strategy);
    const lovelace = panel.lovelace;

    // Same strategy, same output: kept.
    await reconnect();
    expect(panel.lovelace).toBe(lovelace);

    // Same strategy, different output: rebuilt.
    await reconnect();
    expect(generateLovelaceDashboardStrategy).toHaveBeenCalledTimes(3);
    expect(panel.lovelace).not.toBe(lovelace);
  });

  it("rebuilds the dashboard on a manual refresh", async () => {
    const { panel } = await openPanel("dashboard-test");
    const lovelace = panel.lovelace;

    vi.mocked(fetchConfig).mockResolvedValueOnce({ views: [{ cards: [] }] });
    panel
      .shadowRoot!.querySelector("hui-root")!
      .dispatchEvent(new CustomEvent("config-refresh"));
    await flush();

    expect(fetchConfig).toHaveBeenLastCalledWith(
      expect.anything(),
      "dashboard-test",
      true
    );
    expect(panel.lovelace).not.toBe(lovelace);
  });
});
