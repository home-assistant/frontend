import { describe, it, expect, vi, afterEach } from "vitest";
import "../../../../src/panels/lovelace/views/hui-view-background";
import type { HUIViewBackground } from "../../../../src/panels/lovelace/views/hui-view-background";
import type { LovelaceViewBackgroundConfig } from "../../../../src/data/lovelace/config/view";
import type { HomeAssistant } from "../../../../src/types";

const IMAGE_A = "media-source://image_upload/a";
const IMAGE_B = "media-source://image_upload/b";

// Resolutions are answered by hand so a slow one can land after a later,
// already-resolved one — the ordering a cache hit makes easy to hit.
const deferredHass = () => {
  const pending = new Map<string, (url: string) => void>();
  const hass = {
    callWS: vi.fn(
      ({ media_content_id }: { media_content_id: string }) =>
        new Promise((resolve) => {
          pending.set(media_content_id, (url: string) =>
            resolve({ url, mime_type: "image/jpeg" })
          );
        })
    ),
    hassUrl: (path?: string) => path ?? "",
  } as unknown as HomeAssistant;
  return { hass, pending };
};

let elements: HUIViewBackground[] = [];

const mount = async (
  hass: HomeAssistant,
  background: string | LovelaceViewBackgroundConfig
) => {
  const el = document.createElement("hui-view-background") as HUIViewBackground;
  el.hass = hass;
  el.background = background;
  document.body.appendChild(el);
  elements.push(el);
  await el.updateComplete;
  return el;
};

const setBackground = async (
  el: HUIViewBackground,
  background: string | LovelaceViewBackgroundConfig
) => {
  el.background = background;
  await el.updateComplete;
};

// Let the resolve chain drain before checking what was applied
const settle = async (el: HUIViewBackground) => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
  await el.updateComplete;
};

const imageBackground = (
  mediaContentId: string
): LovelaceViewBackgroundConfig => ({
  image: { media_content_id: mediaContentId },
});

const backgroundUrl = (el: HUIViewBackground) =>
  el.style.getPropertyValue("--view-background");

afterEach(() => {
  elements.forEach((el) => el.remove());
  elements = [];
  vi.restoreAllMocks();
});

describe("hui-view-background", () => {
  it("applies the resolved url of a media source background", async () => {
    const { hass, pending } = deferredHass();
    const el = await mount(hass, imageBackground(IMAGE_A));

    pending.get(IMAGE_A)!("/a.jpg?authSig=a");
    await settle(el);

    expect(backgroundUrl(el)).toContain("/a.jpg?authSig=a");
  });

  it("ignores a resolution that arrives after the background changed", async () => {
    const { hass, pending } = deferredHass();
    const el = await mount(hass, imageBackground(IMAGE_A));
    await setBackground(el, imageBackground(IMAGE_B));

    // B resolves first, then the stale A resolution lands
    pending.get(IMAGE_B)!("/b.jpg?authSig=b");
    await settle(el);
    pending.get(IMAGE_A)!("/a.jpg?authSig=a");
    await settle(el);

    expect(backgroundUrl(el)).toContain("/b.jpg?authSig=b");
    expect(backgroundUrl(el)).not.toContain("/a.jpg");
  });

  it("keeps a plain css background untouched", async () => {
    const { hass } = deferredHass();
    const el = await mount(hass, "#3f51b5");

    expect(hass.callWS).not.toHaveBeenCalled();
    expect(backgroundUrl(el)).toBe("#3f51b5");
  });

  it("clears the resolved image when the background is replaced by a color", async () => {
    const { hass, pending } = deferredHass();
    const el = await mount(hass, imageBackground(IMAGE_A));
    pending.get(IMAGE_A)!("/a.jpg?authSig=a");
    await settle(el);

    await setBackground(el, "#3f51b5");

    expect(backgroundUrl(el)).toBe("#3f51b5");
  });

  it("falls back to the theme background when resolving fails", async () => {
    const hass = {
      callWS: vi.fn().mockRejectedValue(new Error("unresolvable")),
      hassUrl: (path?: string) => path ?? "",
    } as unknown as HomeAssistant;
    const el = await mount(hass, imageBackground(IMAGE_A));
    await settle(el);

    expect(backgroundUrl(el)).toBe("");
  });
});
