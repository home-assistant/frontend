import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import type { LightEntity } from "../../../../src/data/light";
import {
  computeLightHueSaturation,
  supportsLightColorHueCardFeature,
} from "../../../../src/panels/lovelace/card-features/hui-light-color-hue-card-feature";
import type { HomeAssistant } from "../../../../src/types";

const entity = (
  entityId: string,
  attributes: HassEntity["attributes"] = {},
  state = "on"
): HassEntity =>
  ({
    entity_id: entityId,
    state,
    attributes,
    last_changed: "",
    last_updated: "",
    context: { id: "", parent_id: null, user_id: null },
  }) as HassEntity;

const hassWith = (...entities: HassEntity[]): HomeAssistant =>
  ({
    states: Object.fromEntries(entities.map((e) => [e.entity_id, e])),
  }) as unknown as HomeAssistant;

describe("supportsLightColorHueCardFeature", () => {
  it.each(["hs", "xy", "rgb", "rgbw", "rgbww"])(
    "supports a light with the %s color mode",
    (mode) => {
      const stateObj = entity("light.test", {
        supported_color_modes: ["color_temp", mode],
      });
      expect(
        supportsLightColorHueCardFeature(hassWith(stateObj), {
          entity_id: stateObj.entity_id,
        })
      ).toBe(true);
    }
  );

  it.each(["onoff", "brightness", "color_temp", "white"])(
    "does not support a light with only the %s color mode",
    (mode) => {
      const stateObj = entity("light.test", { supported_color_modes: [mode] });
      expect(
        supportsLightColorHueCardFeature(hassWith(stateObj), {
          entity_id: stateObj.entity_id,
        })
      ).toBe(false);
    }
  );

  it("does not support other domains", () => {
    const stateObj = entity("switch.test", { supported_color_modes: ["hs"] });
    expect(
      supportsLightColorHueCardFeature(hassWith(stateObj), {
        entity_id: stateObj.entity_id,
      })
    ).toBe(false);
  });

  it("does not support a context with no entity_id", () => {
    expect(supportsLightColorHueCardFeature(hassWith(), {})).toBe(false);
  });
});

describe("computeLightHueSaturation", () => {
  it("keeps the saturation of a light showing a color", () => {
    const stateObj = entity("light.test", {
      color_mode: "hs",
      hs_color: [200, 60],
    }) as LightEntity;
    expect(computeLightHueSaturation(stateObj)).toBe(60);
  });

  it("keeps a faint but visible saturation", () => {
    const stateObj = entity("light.test", {
      color_mode: "hs",
      hs_color: [200, 10],
    }) as LightEntity;
    expect(computeLightHueSaturation(stateObj)).toBe(10);
  });

  it("uses full saturation for a white light in a color mode", () => {
    const stateObj = entity("light.test", {
      color_mode: "rgb",
      hs_color: [0, 0],
    }) as LightEntity;
    expect(computeLightHueSaturation(stateObj)).toBe(100);
  });

  it("uses full saturation for a near-white light picked on the color wheel", () => {
    const stateObj = entity("light.test", {
      color_mode: "hs",
      hs_color: [35, 3],
    }) as LightEntity;
    expect(computeLightHueSaturation(stateObj)).toBe(100);
  });

  it("uses full saturation for a light in color temperature mode", () => {
    const stateObj = entity("light.test", {
      color_mode: "color_temp",
      hs_color: [27, 48],
    }) as LightEntity;
    expect(computeLightHueSaturation(stateObj)).toBe(100);
  });

  it("uses full saturation for a light that is off", () => {
    const stateObj = entity(
      "light.test",
      { color_mode: null, hs_color: null },
      "off"
    ) as LightEntity;
    expect(computeLightHueSaturation(stateObj)).toBe(100);
  });
});
