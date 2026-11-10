import { ContextProvider } from "@lit/context";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiContext,
  internationalizationContext,
} from "../../../src/data/context";
import type { MediaPlayerEntity } from "../../../src/data/media-player";
import { MediaPlayerEntityFeature } from "../../../src/data/media-player";
import "../../../src/components/media-player/ha-media-player-volume";

vi.mock("../../../src/components/ha-icon-button", () => ({}));
vi.mock("../../../src/components/ha-slider", () => ({}));
vi.mock("../../../src/components/ha-svg-icon", () => ({}));

const ENTITY_ID = "media_player.kitchen";

let hosts: HTMLElement[] = [];

const mount = async (
  attributes: Record<string, unknown> = {},
  noWheel = false
) => {
  const callService = vi.fn();
  const host = document.createElement("div");
  new ContextProvider(host, {
    context: internationalizationContext,
    initialValue: { localize: (key: string) => key } as never,
  });
  new ContextProvider(host, {
    context: apiContext,
    initialValue: { callService } as never,
  });

  const element = document.createElement("ha-media-player-volume");
  element.noWheel = noWheel;
  element.stateObj = {
    entity_id: ENTITY_ID,
    state: "playing",
    attributes: {
      supported_features: MediaPlayerEntityFeature.VOLUME_SET,
      volume_level: 0.5,
      ...attributes,
    },
  } as unknown as MediaPlayerEntity;
  host.append(element);
  document.body.append(host);
  hosts.push(host);
  await element.updateComplete;

  const slider = element.shadowRoot!.querySelector<
    HTMLElement & { value: number }
  >(".volume-slider");
  const container = element.shadowRoot!.querySelector(
    ".volume-slider-container"
  );

  return { element, slider, container, callService };
};

const touchEvent = (type: string, clientX: number) =>
  Object.assign(new Event(type, { bubbles: true, composed: true }), {
    touches: [{ clientX, clientY: 0 }],
    changedTouches: [{ clientX, clientY: 0 }],
  });

describe("ha-media-player-volume", () => {
  afterEach(() => {
    hosts.forEach((host) => host.remove());
    hosts = [];
  });

  it("sets the volume on wheel", async () => {
    const { container, callService } = await mount();

    container!.dispatchEvent(new WheelEvent("wheel", { deltaY: -1 }));

    expect(callService).toHaveBeenCalledExactlyOnceWith(
      "media_player",
      "volume_set",
      { entity_id: ENTITY_ID, volume_level: 0.52 }
    );
  });

  // Scrolling a list of speakers must not change their volume
  it("ignores the wheel when no-wheel is set", async () => {
    const { container, callService } = await mount({}, true);

    const wheel = new WheelEvent("wheel", { deltaY: -1, cancelable: true });
    container!.dispatchEvent(wheel);

    expect(callService).not.toHaveBeenCalled();
    expect(wheel.defaultPrevented).toBe(false);
  });

  // A cancelled touch is often the browser taking over a scroll
  it("doesn't change the volume when a touch is cancelled", async () => {
    const { slider, container, callService } = await mount();

    container!.dispatchEvent(touchEvent("touchstart", 0));
    container!.dispatchEvent(touchEvent("touchcancel", 0));

    expect(callService).not.toHaveBeenCalled();
    expect(slider!.value).toBe(50);
  });

  it("shows no slider when the volume is unknown", async () => {
    const { slider } = await mount({ volume_level: undefined });

    expect(slider).toBeNull();
  });
});
