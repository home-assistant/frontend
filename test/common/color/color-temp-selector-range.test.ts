import type { HassEntities } from "home-assistant-js-websocket";
import { assert, describe, it } from "vitest";
import {
  colorTempSelectorForServiceField,
  colorTempSelectorForTargets,
} from "../../../src/common/color/color-temp-selector-range";
import type { Selector } from "../../../src/data/selector";

const genericKelvinSelector: Selector = {
  color_temp: { unit: "kelvin", min: 2000, max: 6500 },
};

const statesFor = (
  ranges: Record<string, { min?: unknown; max?: unknown } | undefined>
): HassEntities => {
  const states: Record<string, { attributes: Record<string, unknown> }> = {};
  for (const [entityId, range] of Object.entries(ranges)) {
    states[entityId] = {
      attributes:
        range === undefined
          ? {}
          : {
              min_color_temp_kelvin: range.min,
              max_color_temp_kelvin: range.max,
            },
    };
  }
  return states as unknown as HassEntities;
};

describe("colorTempSelectorForTargets", () => {
  it("keeps a non-Kelvin selector", () => {
    const selector: Selector = {
      color_temp: { unit: "mired", min: 153, max: 500 },
    };
    const states = statesFor({
      "light.bulb": { min: 1600, max: 4000 },
    });

    assert.strictEqual(
      colorTempSelectorForTargets(selector, states, ["light.bulb"]),
      selector
    );
  });

  it("keeps the generic slider when no light reports a range", () => {
    const states = statesFor({
      "light.bulb": undefined,
    });

    assert.strictEqual(
      colorTempSelectorForTargets(genericKelvinSelector, states, null),
      genericKelvinSelector
    );
    assert.strictEqual(
      colorTempSelectorForTargets(genericKelvinSelector, states, []),
      genericKelvinSelector
    );
    assert.strictEqual(
      colorTempSelectorForTargets(genericKelvinSelector, states, [
        "light.bulb",
      ]),
      genericKelvinSelector
    );
  });

  it("uses the selected light range", () => {
    const states = statesFor({
      "light.oranzovka": { min: 1600, max: 4000 },
    });

    assert.deepEqual(
      colorTempSelectorForTargets(genericKelvinSelector, states, [
        "light.oranzovka",
      ]),
      { color_temp: { unit: "kelvin", min: 1600, max: 4000 } }
    );
    assert.deepEqual(genericKelvinSelector, {
      color_temp: { unit: "kelvin", min: 2000, max: 6500 },
    });
  });

  it("uses the overlap when several lights are targeted", () => {
    const states = statesFor({
      "light.warm": { min: 1600, max: 4000 },
      "light.daylight": { min: 2000, max: 6500 },
    });

    assert.deepEqual(
      colorTempSelectorForTargets(genericKelvinSelector, states, [
        "light.warm",
        "light.daylight",
      ]),
      { color_temp: { unit: "kelvin", min: 2000, max: 4000 } }
    );
  });

  it("spans the widest range when the lights do not overlap", () => {
    const states = statesFor({
      "light.warm": { min: 1600, max: 2500 },
      "light.cold": { min: 5000, max: 6500 },
    });

    assert.deepEqual(
      colorTempSelectorForTargets(genericKelvinSelector, states, [
        "light.warm",
        "light.cold",
      ]),
      { color_temp: { unit: "kelvin", min: 1600, max: 6500 } }
    );
  });

  it("ignores a light with an invalid range", () => {
    const states = statesFor({
      "light.broken": { min: 4000, max: 1600 },
      "light.bulb": { min: "1600", max: 4000 },
      "light.oranzovka": { min: 1600, max: 4000 },
    });

    assert.deepEqual(
      colorTempSelectorForTargets(genericKelvinSelector, states, [
        "light.missing",
        "light.broken",
        "light.bulb",
        "light.oranzovka",
      ]),
      { color_temp: { unit: "kelvin", min: 1600, max: 4000 } }
    );
  });
});

const lightServiceTarget = { entity: { domain: "light" } };

const areaHass = {
  states: {
    "light.kitchen": {
      entity_id: "light.kitchen",
      state: "on",
      attributes: {
        min_color_temp_kelvin: 1600,
        max_color_temp_kelvin: 4000,
      },
    },
    "light.hallway": {
      entity_id: "light.hallway",
      state: "on",
      attributes: {
        min_color_temp_kelvin: 2700,
        max_color_temp_kelvin: 6500,
      },
    },
  },
  entities: {
    "light.kitchen": { entity_id: "light.kitchen", device_id: "hub" },
    "light.hallway": {
      entity_id: "light.hallway",
      device_id: "hub",
      area_id: "hallway",
    },
  },
  devices: { hub: { id: "hub", area_id: "kitchen" } },
  areas: {
    kitchen: { area_id: "kitchen" },
    hallway: { area_id: "hallway" },
  },
} as unknown as Parameters<typeof colorTempSelectorForServiceField>[3];

describe("colorTempSelectorForServiceField", () => {
  it("keeps a selector that is not the light color temperature field", () => {
    const scriptSelector: Selector = {
      color_temp: { unit: "kelvin", min: 3000, max: 3500 },
    };

    assert.strictEqual(
      colorTempSelectorForServiceField(
        "script",
        "color_temp_kelvin",
        scriptSelector,
        areaHass,
        { data: { entity_id: "light.kitchen" } },
        lightServiceTarget
      ),
      scriptSelector
    );
    assert.strictEqual(
      colorTempSelectorForServiceField(
        "light",
        "brightness_pct",
        genericKelvinSelector,
        areaHass,
        { target: { entity_id: "light.kitchen" } },
        lightServiceTarget
      ),
      genericKelvinSelector
    );
  });

  it("ignores a light on an area device that belongs to another area", () => {
    assert.deepEqual(
      colorTempSelectorForServiceField(
        "light",
        "color_temp_kelvin",
        genericKelvinSelector,
        areaHass,
        { target: { area_id: "kitchen" } },
        lightServiceTarget
      ),
      { color_temp: { unit: "kelvin", min: 1600, max: 4000 } }
    );
  });

  it("normalizes comma-separated and mixed-case entity ids", () => {
    const hass = {
      states: {
        "light.warm": {
          entity_id: "light.warm",
          state: "on",
          attributes: {
            min_color_temp_kelvin: 1600,
            max_color_temp_kelvin: 4000,
          },
        },
        "light.other": {
          entity_id: "light.other",
          state: "on",
          attributes: {
            min_color_temp_kelvin: 1600,
            max_color_temp_kelvin: 4000,
          },
        },
      },
      entities: {
        "light.warm": { entity_id: "light.warm" },
        "light.other": { entity_id: "light.other" },
      },
      devices: {},
      areas: {},
    } as unknown as Parameters<typeof colorTempSelectorForServiceField>[3];

    assert.deepEqual(
      colorTempSelectorForServiceField(
        "light",
        "color_temp_kelvin",
        genericKelvinSelector,
        hass,
        { data: { entity_id: "Light.Warm, light.other" } },
        lightServiceTarget
      ),
      { color_temp: { unit: "kelvin", min: 1600, max: 4000 } }
    );
  });

  it("ignores a categorized light reached through an area", () => {
    const hass = {
      ...areaHass,
      states: {
        ...areaHass.states,
        "light.config": {
          entity_id: "light.config",
          state: "on",
          attributes: {
            min_color_temp_kelvin: 2700,
            max_color_temp_kelvin: 6500,
          },
        },
      },
      entities: {
        ...areaHass.entities,
        "light.config": {
          entity_id: "light.config",
          device_id: "hub",
          entity_category: "config",
        },
      },
    } as unknown as Parameters<typeof colorTempSelectorForServiceField>[3];

    assert.deepEqual(
      colorTempSelectorForServiceField(
        "light",
        "color_temp_kelvin",
        genericKelvinSelector,
        hass,
        { target: { area_id: "kitchen" } },
        lightServiceTarget
      ),
      { color_temp: { unit: "kelvin", min: 1600, max: 4000 } }
    );
    assert.deepEqual(
      colorTempSelectorForServiceField(
        "light",
        "color_temp_kelvin",
        genericKelvinSelector,
        hass,
        { target: { entity_id: "light.config" } },
        lightServiceTarget
      ),
      { color_temp: { unit: "kelvin", min: 2700, max: 6500 } }
    );
  });

  it("keeps the generic slider when the target is a template", () => {
    assert.strictEqual(
      colorTempSelectorForServiceField(
        "light",
        "color_temp_kelvin",
        genericKelvinSelector,
        areaHass,
        { target: { entity_id: "{{ lights }}" } },
        lightServiceTarget
      ),
      genericKelvinSelector
    );
  });
});
