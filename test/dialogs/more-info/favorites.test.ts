import type { HassEntity } from "home-assistant-js-websocket";
import { describe, it, expect } from "vitest";
import { isLightCompatibleForFavoritesCopy } from "../../../src/dialogs/more-info/favorites";
import { LightColorMode } from "../../../src/data/light";

const light = (entityId: string, colorModes: LightColorMode[]): HassEntity =>
  ({
    entity_id: entityId,
    state: "on",
    attributes: { supported_color_modes: colorModes },
    last_changed: "",
    last_updated: "",
    context: { id: "", parent_id: null, user_id: null },
  }) as HassEntity;

describe("isLightCompatibleForFavoritesCopy", () => {
  it("includes a candidate with the same color+brightness capability and a matching color type", () => {
    const candidate = light("light.candidate", [LightColorMode.HS]);
    expect(
      isLightCompatibleForFavoritesCopy(candidate, "light.source", true, true, [
        "hs_color",
      ])
    ).toBe(true);
  });

  it("includes a brightness-only candidate when the source is also brightness-only", () => {
    const candidate = light("light.candidate", [LightColorMode.BRIGHTNESS]);
    expect(
      isLightCompatibleForFavoritesCopy(
        candidate,
        "light.source",
        false,
        true,
        []
      )
    ).toBe(true);
  });

  it("excludes a color-capable candidate when the source is brightness-only (the fixed data-loss bug)", () => {
    const candidate = light("light.candidate", [LightColorMode.HS]);
    expect(
      isLightCompatibleForFavoritesCopy(
        candidate,
        "light.source",
        false,
        true,
        []
      )
    ).toBe(false);
  });

  it("excludes a brightness-only candidate when the source supports color", () => {
    const candidate = light("light.candidate", [LightColorMode.BRIGHTNESS]);
    expect(
      isLightCompatibleForFavoritesCopy(candidate, "light.source", true, true, [
        "hs_color",
      ])
    ).toBe(false);
  });

  it("excludes the source entity itself", () => {
    const candidate = light("light.source", [LightColorMode.HS]);
    expect(
      isLightCompatibleForFavoritesCopy(candidate, "light.source", true, true, [
        "hs_color",
      ])
    ).toBe(false);
  });

  it("excludes a candidate with a non-matching color type", () => {
    const candidate = light("light.candidate", [LightColorMode.COLOR_TEMP]);
    expect(
      isLightCompatibleForFavoritesCopy(candidate, "light.source", true, true, [
        "hs_color",
      ])
    ).toBe(false);
  });
});
