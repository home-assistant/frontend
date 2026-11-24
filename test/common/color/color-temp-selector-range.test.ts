import { assert, describe, it } from "vitest";
import { kelvinRangeFromEntityStates } from "../../../src/common/color/color-temp-selector-range";

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
