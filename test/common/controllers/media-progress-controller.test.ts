import type { ReactiveControllerHost } from "@lit/reactive-element/reactive-controller";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MediaProgressController } from "../../../src/common/controllers/media-progress-controller";
import type { HaSlider } from "../../../src/components/ha-slider";
import type { MediaPlayerEntity } from "../../../src/data/media-player";

describe("MediaProgressController", () => {
  let dragging: boolean;
  let slider: HaSlider;
  let controller: MediaProgressController;

  beforeEach(() => {
    dragging = false;
    slider = {
      value: 0,
      customStates: {
        has: (state: string) => state === "dragging" && dragging,
      },
      // Chromium < 125 throws on matches(":state(...)").
      matches: (selector: string) => {
        if (selector.includes(":state(")) {
          throw new DOMException(`'${selector}' is not a valid selector.`);
        }
        return false;
      },
    } as unknown as HaSlider;
    controller = new MediaProgressController(
      { addController: vi.fn() } as unknown as ReactiveControllerHost,
      {
        getStateObj: () =>
          ({
            state: "paused",
            attributes: { media_duration: 300, media_position: 42 },
          }) as unknown as MediaPlayerEntity,
        getSlider: () => slider,
      }
    );
  });

  it("writes the position where :state() is not supported", () => {
    controller.hostUpdate();
    controller.hostUpdated();
    expect(slider.value).toBe(42);
  });

  it("leaves the slider alone while it is dragged", () => {
    dragging = true;
    controller.hostUpdate();
    controller.hostUpdated();
    expect(slider.value).toBe(0);
  });
});
