import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeLovelaceUpdates } from "../../../src/data/lovelace";
import { fetchConfig } from "../../../src/data/lovelace/config/types";
import "../../../src/panels/lovelace/ha-panel-lovelace";

type LovelacePanel = HTMLElement & {
  hass: unknown;
  panel: unknown;
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

const openPanel = async (urlPath: string) => {
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
  vi.mocked(fetchConfig).mockResolvedValue({ views: [{ cards: [] }] });

  const panel = document.createElement(
    "ha-panel-lovelace"
  ) as unknown as LovelacePanel;
  panel.hass = {
    connection: {},
    locale: { language: "en" },
    localize: (key: string) => key,
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
