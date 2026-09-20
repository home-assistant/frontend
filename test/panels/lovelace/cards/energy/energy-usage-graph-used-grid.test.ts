/**
 * Protects the energy usage graph from adding an empty combined Grid
 * legend item for single-source + battery setups, while still combining
 * sources when multiple grid imports share a battery-charging period.
 */
import { assert, describe, it } from "vitest";

import { buildCombinedUsedGrid } from "../../../../../src/panels/lovelace/cards/energy/energy-usage-graph-used-grid";

const t = 1_700_000_000_000;

describe("buildCombinedUsedGrid", () => {
  it("does not add a combined series for a single grid source charging a battery", () => {
    const fromGridBySource = {
      "sensor.grid_import": { [t]: 10 },
    };

    const result = buildCombinedUsedGrid(
      fromGridBySource,
      { [t]: 3 },
      { [t]: 7 }
    );

    assert.isUndefined(result);
    assert.equal(fromGridBySource["sensor.grid_import"][t], 7);
  });

  it("combines overlapping grid sources and removes per-source points", () => {
    const fromGridBySource = {
      "sensor.grid_import_a": { [t]: 6 },
      "sensor.grid_import_b": { [t]: 4 },
    };

    const result = buildCombinedUsedGrid(
      fromGridBySource,
      { [t]: 3 },
      { [t]: 7 }
    );

    assert.deepEqual(result, { [t]: 7 });
    assert.isUndefined(fromGridBySource["sensor.grid_import_a"][t]);
    assert.isUndefined(fromGridBySource["sensor.grid_import_b"][t]);
  });

  it("does not add a combined series when battery is present but not charging from grid", () => {
    const fromGridBySource = {
      "sensor.grid_import": { [t]: 10 },
    };

    const result = buildCombinedUsedGrid(fromGridBySource, {}, { [t]: 10 });

    assert.isUndefined(result);
    assert.equal(fromGridBySource["sensor.grid_import"][t], 10);
  });
});
