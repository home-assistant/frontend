import { afterEach, describe, expect, it, vi } from "vitest";
import type { HaAppIcon } from "../../src/components/ha-app-icon";
import "../../src/components/ha-app-icon";

let appIcon: HaAppIcon | undefined;

const mountAppIcon = async (properties: Partial<HaAppIcon> = {}) => {
  appIcon = document.createElement("ha-app-icon");
  Object.assign(appIcon, properties);
  appIcon.append(document.createElement("ha-svg-icon"));
  document.body.append(appIcon);
  await appIcon.updateComplete;
  return appIcon;
};

afterEach(() => {
  appIcon?.remove();
  appIcon = undefined;
  vi.unstubAllGlobals();
});

describe("ha-app-icon", () => {
  it("does not request an unavailable icon", async () => {
    const element = await mountAppIcon({ slug: "example", hasIcon: false });

    expect(element.shadowRoot!.querySelector("img")).toBeNull();
    expect(element.shadowRoot!.querySelector("slot")).not.toBeNull();
  });

  it.each([true, undefined])(
    "requests the icon when availability is %s",
    async (hasIcon) => {
      const element = await mountAppIcon({ slug: "example", hasIcon });

      expect(
        element.shadowRoot!.querySelector("img")!.getAttribute("src")
      ).toBe("/api/hassio/addons/example/icon");
    }
  );

  it("requests the icon from the configured Home Assistant URL", async () => {
    vi.stubGlobal("__HASS_URL__", "http://homeassistant.local:8123");
    const element = await mountAppIcon({ slug: "example", hasIcon: true });
    const image = element.shadowRoot!.querySelector("img")!;

    expect(image.getAttribute("src")).toBe(
      "http://homeassistant.local:8123/api/hassio/addons/example/icon"
    );
    expect(image.hasAttribute("crossorigin")).toBe(false);
  });

  it("renders the fallback after an image error", async () => {
    const element = await mountAppIcon({ slug: "example", hasIcon: true });

    element.shadowRoot!.querySelector("img")!.dispatchEvent(new Event("error"));
    await element.updateComplete;

    expect(element.shadowRoot!.querySelector("img")).toBeNull();
    expect(element.shadowRoot!.querySelector("slot")).not.toBeNull();
  });

  it("tries a new source after the slug changes", async () => {
    const element = await mountAppIcon({ slug: "first", hasIcon: true });
    element.shadowRoot!.querySelector("img")!.dispatchEvent(new Event("error"));
    await element.updateComplete;

    element.slug = "second";
    await element.updateComplete;

    expect(element.shadowRoot!.querySelector("img")!.getAttribute("src")).toBe(
      "/api/hassio/addons/second/icon"
    );
  });

  it("ignores an error from a previous source", async () => {
    const element = await mountAppIcon({ slug: "first", hasIcon: true });
    const firstImage = element.shadowRoot!.querySelector("img")!;

    element.slug = "second";
    await element.updateComplete;
    firstImage.dispatchEvent(new Event("error"));
    await element.updateComplete;

    expect(element.shadowRoot!.querySelector("img")!.getAttribute("src")).toBe(
      "/api/hassio/addons/second/icon"
    );
  });

  it("ignores an old error after returning to the same source", async () => {
    const element = await mountAppIcon({ slug: "first", hasIcon: true });
    const firstImage = element.shadowRoot!.querySelector("img")!;

    element.slug = "second";
    await element.updateComplete;
    element.slug = "first";
    await element.updateComplete;
    firstImage.dispatchEvent(new Event("error"));
    await element.updateComplete;

    expect(element.shadowRoot!.querySelector("img")!.getAttribute("src")).toBe(
      "/api/hassio/addons/first/icon"
    );
  });
});
