import { LitElement } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HassTabsSubpage } from "../../src/layouts/hass-tabs-subpage";
import type { HomeAssistant } from "../../src/types";

// The real back button pulls in the localize context, which is not provided here.
vi.mock("../../src/components/ha-icon-button-arrow-prev", () => ({}));
vi.mock("../../src/components/ha-menu-button", () => ({}));
vi.mock("../../src/components/ha-tab", () => ({}));
customElements.define("ha-icon-button-arrow-prev", class extends LitElement {});
customElements.define("ha-menu-button", class extends LitElement {});
customElements.define("ha-tab", class extends LitElement {});
await import("../../src/layouts/hass-tabs-subpage");

const hass = {
  config: { components: [] },
  language: "en",
  localize: (key: string) => key,
} as unknown as HomeAssistant;

let host: HTMLDivElement | undefined;

const mount = async (backPath: string) => {
  host = document.createElement("div");
  document.body.append(host);
  const element = document.createElement(
    "hass-tabs-subpage"
  ) as HassTabsSubpage;
  Object.assign(element, {
    hass,
    route: { prefix: "", path: "" },
    tabs: [],
    backPath,
  });
  host.append(element);
  await element.updateComplete;
  return element.shadowRoot!.querySelector("ha-icon-button-arrow-prev") as
    (LitElement & { href?: string }) | null;
};

afterEach(() => {
  host?.remove();
  host = undefined;
});

describe("hass-tabs-subpage back path", () => {
  it("links to a path on the current origin", async () => {
    const backButton = await mount("/config");
    expect(backButton!.href).toEqual("/config");
  });

  // eslint-disable-next-line no-script-url
  it.each(["javascript:alert(1)", "https://example.com/"])(
    "does not link to %s",
    async (backPath) => {
      const backButton = await mount(backPath);
      expect(backButton!.href).toBeUndefined();
    }
  );
});
