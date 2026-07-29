import { LitElement } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";

// The real back button pulls in the localize context, which is not provided here.
vi.mock("../../src/components/ha-icon-button-arrow-prev", () => ({}));
vi.mock("../../src/components/ha-menu-button", () => ({}));
customElements.define("ha-icon-button-arrow-prev", class extends LitElement {});
customElements.define("ha-menu-button", class extends LitElement {});
await import("../../src/layouts/hass-subpage");

let host: HTMLDivElement | undefined;

const mount = async (backPath: string) => {
  host = document.createElement("div");
  document.body.append(host);
  const element = document.createElement("hass-subpage");
  element.setAttribute("back-path", backPath);
  host.append(element);
  await (element as LitElement).updateComplete;
  return element.shadowRoot!.querySelector("ha-icon-button-arrow-prev");
};

afterEach(() => {
  host?.remove();
  host = undefined;
});

describe("hass-subpage back path", () => {
  it("links to a path on the current origin", async () => {
    const backButton = await mount("/config/system");
    expect(backButton!.getAttribute("href")).toEqual("/config/system");
  });

  // eslint-disable-next-line no-script-url
  it.each(["javascript:alert(1)", "https://example.com/"])(
    "does not link to %s",
    async (backPath) => {
      const backButton = await mount(backPath);
      expect(backButton!.hasAttribute("href")).toBe(false);
    }
  );
});
