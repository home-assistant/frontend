import type { HassEntities } from "home-assistant-js-websocket";
import { assert, describe, it } from "vitest";
import { colorTempSelectorForTargets } from "../../../src/common/color/color-temp-selector-range";
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
