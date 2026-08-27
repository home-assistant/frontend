import { afterEach, describe, expect, test, vi } from "vitest";

import "../../../../src/panels/config/scene/ha-scene-editor";
import type { HaSceneEditor } from "../../../../src/panels/config/scene/ha-scene-editor";
import { createMockHass } from "../../../fixtures/hass";

describe("scene editor live disconnect", () => {
  afterEach(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
  });

  test("exits live mode and restores stored states when leaving the page", () => {
    const el = document.createElement("ha-scene-editor") as HaSceneEditor;
    const hass = createMockHass();
    (hass as any).callService = vi.fn(async () => ({}));
    el.hass = hass;

    const unsubscribe = vi.fn();
    const storedStates = { "light.kitchen": "on" };
    (el as any)._mode = "live";
    (el as any)._storedStates = storedStates;
    (el as any)._unsubscribeEvents = unsubscribe;

    el.disconnectedCallback();

    expect(hass.callService).toHaveBeenCalledWith("scene", "apply", {
      entities: storedStates,
    });
    expect(unsubscribe).toHaveBeenCalled();
    expect((el as any)._unsubscribeEvents).toBeUndefined();
    expect((el as any)._mode).toBe("review");
  });

  test("does not restore stored states when the tab is hidden", () => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });

    const el = document.createElement("ha-scene-editor") as HaSceneEditor;
    const hass = createMockHass();
    (hass as any).callService = vi.fn(async () => ({}));
    el.hass = hass;

    const unsubscribe = vi.fn();
    (el as any)._mode = "live";
    (el as any)._storedStates = { "light.kitchen": "on" };
    (el as any)._unsubscribeEvents = unsubscribe;

    el.disconnectedCallback();

    expect(hass.callService).not.toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalled();
    expect((el as any)._mode).toBe("live");
  });
});
