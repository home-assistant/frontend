import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HassioAddonsInfo } from "../../../../src/data/hassio/addon";
import { fetchHassioAddonsInfo } from "../../../../src/data/hassio/addon";
import type { SupervisorStore } from "../../../../src/data/supervisor/store";
import { fetchSupervisorStore } from "../../../../src/data/supervisor/store";
import { checkForAppUpdates } from "../../../../src/panels/config/apps/common/check-for-updates";
import type { HomeAssistant } from "../../../../src/types";
import "../../../../src/panels/config/apps/ha-config-apps-available";

vi.mock("../../../../src/layouts/hass-subpage", () => {
  customElements.define("hass-subpage", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/layouts/hass-loading-screen", () => {
  customElements.define("hass-loading-screen", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/layouts/hass-error-screen", () => {
  customElements.define("hass-error-screen", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/components/ha-dropdown", () => {
  customElements.define("ha-dropdown", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/components/ha-dropdown-item", () => {
  customElements.define("ha-dropdown-item", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/components/ha-icon-button", () => {
  customElements.define("ha-icon-button", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/components/input/ha-input-search", () => {
  customElements.define("ha-input-search", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/panels/config/apps/supervisor-apps-repository", () => {
  customElements.define(
    "supervisor-apps-repository",
    class extends HTMLElement {}
  );
  return {};
});
vi.mock("../../../../src/data/hassio/addon", () => ({
  fetchHassioAddonsInfo: vi.fn(),
}));
vi.mock("../../../../src/data/supervisor/store", () => ({
  addStoreRepository: vi.fn(),
  fetchSupervisorStore: vi.fn(),
}));
vi.mock("../../../../src/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(),
  showConfirmationDialog: vi.fn(),
}));
vi.mock("../../../../src/panels/config/apps/common/check-for-updates", () => ({
  checkForAppUpdates: vi.fn(),
}));

const info = (...slugs: string[]) =>
  ({
    addons: slugs.map((slug) => ({ slug, update_available: true })),
    repositories: [],
  }) as unknown as HassioAddonsInfo;

const store = { addons: [], repositories: [] } as unknown as SupervisorStore;

const hass = {
  localize: (key: string) => key,
} as unknown as HomeAssistant;

const nextTask = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

const renderPage = async () => {
  const page = document.createElement("ha-config-apps-available") as any;
  page.hass = hass;
  document.body.append(page);
  await nextTask();
  await page.updateComplete;
  return page;
};

const checkUpdatesItem = (page: any): HTMLElement & { disabled: boolean } =>
  page.shadowRoot.querySelector("ha-dropdown-item[value=check_updates]");

const selectCheckUpdates = (page: any) =>
  page.shadowRoot.querySelector("ha-dropdown").dispatchEvent(
    new CustomEvent("wa-select", {
      detail: { item: { value: "check_updates" } },
    })
  );

describe("ha-config-apps-available check for updates", () => {
  beforeEach(() => {
    vi.mocked(fetchHassioAddonsInfo).mockResolvedValue(info("ssh"));
    vi.mocked(fetchSupervisorStore).mockResolvedValue(store);
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.replaceChildren();
  });

  it("disables the menu item until the check finishes", async () => {
    let finish!: (value: HassioAddonsInfo | undefined) => void;
    vi.mocked(checkForAppUpdates).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const page = await renderPage();

    selectCheckUpdates(page);
    await page.updateComplete;
    expect(checkUpdatesItem(page).disabled).toBe(true);

    finish(info("ssh"));
    await nextTask();
    await page.updateComplete;
    expect(checkUpdatesItem(page).disabled).toBe(false);
  });

  it("keeps the apps from the check and only reloads the store", async () => {
    const checked = info("ssh", "mosquitto");
    vi.mocked(checkForAppUpdates).mockResolvedValue(checked);
    const page = await renderPage();

    selectCheckUpdates(page);
    await nextTask();

    expect(checkForAppUpdates).toHaveBeenCalledWith(page, hass);
    expect(fetchHassioAddonsInfo).toHaveBeenCalledTimes(1);
    expect(fetchSupervisorStore).toHaveBeenCalledTimes(2);
    expect(page._addon).toBe(checked);
  });

  it("reloads the apps and the store when the check fails", async () => {
    vi.mocked(checkForAppUpdates).mockResolvedValue(undefined);
    const page = await renderPage();
    const reloaded = info("ssh", "vscode");
    vi.mocked(fetchHassioAddonsInfo).mockResolvedValue(reloaded);

    selectCheckUpdates(page);
    await nextTask();

    expect(fetchHassioAddonsInfo).toHaveBeenCalledTimes(2);
    expect(fetchSupervisorStore).toHaveBeenCalledTimes(2);
    expect(page._addon).toBe(reloaded);
  });
});
