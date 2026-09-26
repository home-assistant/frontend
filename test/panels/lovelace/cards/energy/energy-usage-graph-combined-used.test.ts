/**
 * Protects the energy usage graph from adding an empty combined Grid or
 * Battery legend item, while still combining sources when multiple grid
 * imports share a battery-charging period or multiple batteries share an
 * exporting period.
 */
import { assert, describe, it } from "vitest";

import { buildCombinedUsed } from "../../../../../src/panels/lovelace/cards/energy/energy-usage-graph-combined-used";

const t = 1_700_000_000_000;

describe("buildCombinedUsed", () => {
  it("does not add a combined series for a single grid source charging a battery", () => {
    const fromGridBySource = {
      "sensor.grid_import": { [t]: 10 },
    };

    const result = buildCombinedUsed(fromGridBySource, { [t]: 3 }, { [t]: 7 });

    assert.isUndefined(result);
    assert.equal(fromGridBySource["sensor.grid_import"][t], 7);
  });

  it("combines overlapping grid sources and removes per-source points", () => {
    const fromGridBySource = {
      "sensor.grid_import_a": { [t]: 6 },
      "sensor.grid_import_b": { [t]: 4 },
    };

    const result = buildCombinedUsed(fromGridBySource, { [t]: 3 }, { [t]: 7 });

    assert.deepEqual(result, { [t]: 7 });
    assert.isUndefined(fromGridBySource["sensor.grid_import_a"][t]);
    assert.isUndefined(fromGridBySource["sensor.grid_import_b"][t]);
  });

  it("does not add a combined series when battery is present but not charging from grid", () => {
    const fromGridBySource = {
      "sensor.grid_import": { [t]: 10 },
    };

    const result = buildCombinedUsed(fromGridBySource, {}, { [t]: 10 });

    assert.isUndefined(result);
    assert.equal(fromGridBySource["sensor.grid_import"][t], 10);
  });

  it("does not add a combined series when the home used none of the energy", () => {
    const fromBatteryBySource = {
      "sensor.battery_a_out": { [t]: 2 },
      "sensor.battery_b_out": { [t]: 1 },
    };

    // All discharge exported; the model leaves 2.8e-17 as "used"
    const result = buildCombinedUsed(
      fromBatteryBySource,
      { [t]: 3 },
      { [t]: 2.7755575615628914e-17 }
    );

    assert.isUndefined(result);
    assert.isUndefined(fromBatteryBySource["sensor.battery_a_out"][t]);
    assert.isUndefined(fromBatteryBySource["sensor.battery_b_out"][t]);
  });

  it("treats float noise in the unused energy as zero", () => {
    const fromGridBySource = {
      "sensor.grid_import_a": { [t]: 0.06 },
      "sensor.grid_import_b": { [t]: 0.04 },
    };

    // 0.06 + 0.04 + 0.4 solar - 0.4 to battery leaves 2.8e-17 "grid to battery"
    const result = buildCombinedUsed(
      fromGridBySource,
      { [t]: 2.7755575615628914e-17 },
      { [t]: 0.1 }
    );

    assert.isUndefined(result);
    assert.equal(fromGridBySource["sensor.grid_import_a"][t], 0.06);
    assert.equal(fromGridBySource["sensor.grid_import_b"][t], 0.04);
  });
});
