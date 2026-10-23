import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  HassioAddonInfo,
  HassioAddonsInfo,
} from "../../../../src/data/hassio/addon";
import { fetchHassioAddonsInfo } from "../../../../src/data/hassio/addon";
import { checkForAppUpdates } from "../../../../src/panels/config/apps/common/check-for-updates";
import type { HomeAssistant } from "../../../../src/types";
import "../../../../src/panels/config/apps/ha-config-apps-installed";

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
vi.mock("../../../../src/components/ha-button", () => {
  customElements.define("ha-button", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/components/ha-card", () => {
  customElements.define("ha-card", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/components/ha-svg-icon", () => {
  customElements.define("ha-svg-icon", class extends HTMLElement {});
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
vi.mock(
  "../../../../src/panels/config/apps/components/supervisor-apps-card-content",
  () => {
    customElements.define(
      "supervisor-apps-card-content",
      class extends HTMLElement {}
    );
    return {};
  }
);
vi.mock("../../../../src/data/hassio/addon", () => ({
  fetchHassioAddonsInfo: vi.fn(),
}));
vi.mock("../../../../src/panels/config/apps/common/check-for-updates", () => ({
  checkForAppUpdates: vi.fn(),
}));

const info = (...slugs: string[]) =>
  ({
    addons: slugs.map((slug) => ({ slug, name: slug, update_available: true })),
    repositories: [],
  }) as unknown as HassioAddonsInfo;

const hass = {
  localize: (key: string) => key,
  locale: { language: "en" },
} as unknown as HomeAssistant;

const nextTask = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

const renderPage = async () => {
  const page = document.createElement("ha-config-apps-installed") as any;
  page.hass = hass;
  document.body.append(page);
  await nextTask();
  await page.updateComplete;
  return page;
};

const button = (page: any): HTMLElement & { disabled: boolean } =>
  page.shadowRoot.querySelector("ha-icon-button");

const renderedSlugs = (page: any) =>
  Array.from<HTMLElement & { addon: HassioAddonInfo }>(
    page.shadowRoot.querySelectorAll("ha-card[role=button]")
  ).map((card) => card.addon.slug);

describe("ha-config-apps-installed check for updates", () => {
  beforeEach(() => {
    vi.mocked(fetchHassioAddonsInfo).mockResolvedValue(info("ssh"));
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.replaceChildren();
  });

  it("disables the button until the check finishes", async () => {
    let finish!: (value: HassioAddonsInfo | undefined) => void;
    vi.mocked(checkForAppUpdates).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const page = await renderPage();

    button(page).click();
    await page.updateComplete;
    expect(button(page).disabled).toBe(true);

    finish(info("ssh"));
    await nextTask();
    await page.updateComplete;
    expect(button(page).disabled).toBe(false);
  });

  it("shows the apps from the check without fetching them again", async () => {
    vi.mocked(checkForAppUpdates).mockResolvedValue(info("ssh", "mosquitto"));
    const page = await renderPage();

    button(page).click();
    await nextTask();
    await page.updateComplete;

    expect(checkForAppUpdates).toHaveBeenCalledWith(page, hass);
    expect(fetchHassioAddonsInfo).toHaveBeenCalledTimes(1);
    expect(renderedSlugs(page)).toEqual(["mosquitto", "ssh"]);
  });

  it("reloads the apps when the check fails", async () => {
    vi.mocked(checkForAppUpdates).mockResolvedValue(undefined);
    const page = await renderPage();
    vi.mocked(fetchHassioAddonsInfo).mockResolvedValue(info("ssh", "vscode"));

    button(page).click();
    await nextTask();
    await page.updateComplete;

    expect(fetchHassioAddonsInfo).toHaveBeenCalledTimes(2);
    expect(renderedSlugs(page)).toEqual(["ssh", "vscode"]);
    expect(button(page).disabled).toBe(false);
  });
});
