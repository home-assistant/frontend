import { assert, describe, it } from "vitest";
import {
  kelvinRangeFromEntityStates,
  kelvinValueInsideEntityRange,
} from "../../../src/common/color/color-temp-selector-range";

const statesFor = (
  ranges: Record<string, { min?: unknown; max?: unknown } | undefined>
) => {
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
  return states;
};

describe("kelvinRangeFromEntityStates", () => {
  it("returns undefined when no entity reports a range", () => {
    assert.strictEqual(kelvinRangeFromEntityStates(undefined), undefined);
    assert.deepEqual(kelvinRangeFromEntityStates({}), undefined);
    assert.deepEqual(
      kelvinRangeFromEntityStates(statesFor({ "light.bulb": undefined })),
      undefined
    );
  });

  it("uses the selected light range", () => {
    assert.deepEqual(
      kelvinRangeFromEntityStates(
        statesFor({ "light.oranzovka": { min: 1600, max: 4000 } })
      ),
      { min: 1600, max: 4000 }
    );
  });

  it("uses the overlap when several lights are targeted", () => {
    assert.deepEqual(
      kelvinRangeFromEntityStates(
        statesFor({
          "light.warm": { min: 1600, max: 4000 },
          "light.daylight": { min: 2000, max: 6500 },
        })
      ),
      { min: 2000, max: 4000 }
    );
  });

  it("spans the widest range when the lights do not overlap", () => {
    assert.deepEqual(
      kelvinRangeFromEntityStates(
        statesFor({
          "light.warm": { min: 1600, max: 2500 },
          "light.cold": { min: 5000, max: 6500 },
        })
      ),
      { min: 1600, max: 6500 }
    );
  });

  it("ignores a light with an invalid range", () => {
    assert.deepEqual(
      kelvinRangeFromEntityStates(
        statesFor({
          "light.broken": { min: 4000, max: 1600 },
          "light.bulb": { min: "1600", max: 4000 },
          "light.oranzovka": { min: 1600, max: 4000 },
        })
      ),
      { min: 1600, max: 4000 }
    );
  });
});

describe("kelvinValueInsideEntityRange", () => {
  const states = statesFor({ "light.bulb": { min: 2700, max: 4000 } });

  it("moves a schema minimum up to the light minimum", () => {
    assert.strictEqual(kelvinValueInsideEntityRange(2000, states), 2700);
  });

  it("moves a value above the light maximum down", () => {
    assert.strictEqual(kelvinValueInsideEntityRange(6500, states), 4000);
  });

  it("keeps a value that is already inside the range", () => {
    assert.strictEqual(kelvinValueInsideEntityRange(3000, states), 3000);
  });

  it("keeps the original value when no entity reports a range", () => {
    assert.strictEqual(kelvinValueInsideEntityRange(2000, undefined), 2000);
    assert.strictEqual(
      kelvinValueInsideEntityRange(
        2000,
        statesFor({ "light.bulb": undefined })
      ),
      2000
    );
  });
});
