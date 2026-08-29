/**
 * Protects the energy usage graph's per-source attribution while preserving
 * the combined Grid fallback whenever the battery-charging source is unclear.
 */
import { assert, describe, it } from "vitest";

import type { EnergySource } from "../../../../../src/data/energy";
import {
  buildCombinedUsedGrid,
  getNonBatteryChargingGridStats,
} from "../../../../../src/panels/lovelace/cards/energy/energy-usage-graph-used-grid";

const t = 1_700_000_000_000;

const gridSource = (
  statEnergyFrom: string | null,
  canChargeBattery?: boolean
): EnergySource =>
  ({
    type: "grid",
    stat_energy_from: statEnergyFrom,
    ...(canChargeBattery === undefined
      ? {}
      : { can_charge_battery: canChargeBattery }),
  }) as EnergySource;

describe("getNonBatteryChargingGridStats", () => {
  it("collects only grid imports explicitly unable to charge the battery", () => {
    const result = getNonBatteryChargingGridStats([
      gridSource("sensor.inverter"),
      gridSource("sensor.wall_connector", false),
      gridSource("sensor.explicitly_chargeable", true),
      gridSource(null, false),
      {
        type: "battery",
        stat_energy_from: "sensor.battery_discharge",
        stat_energy_to: "sensor.battery_charge",
      },
    ]);

    assert.deepEqual([...result], ["sensor.wall_connector"]);
  });
});

describe("buildCombinedUsedGrid", () => {
  it("does not add a combined series for a single grid source charging a battery", () => {
    const fromGridBySource = {
      "sensor.grid_import": { [t]: 10 },
    };

    const result = buildCombinedUsedGrid(
      fromGridBySource,
      { [t]: 3 },
      { [t]: 7 },
      new Set()
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
      { [t]: 7 },
      new Set()
    );

    assert.deepEqual(result, { [t]: 7 });
    assert.isUndefined(fromGridBySource["sensor.grid_import_a"][t]);
    assert.isUndefined(fromGridBySource["sensor.grid_import_b"][t]);
  });

  it("does not add a combined series when battery is present but not charging from grid", () => {
    const fromGridBySource = {
      "sensor.grid_import": { [t]: 10 },
    };

    const result = buildCombinedUsedGrid(
      fromGridBySource,
      {},
      { [t]: 10 },
      new Set()
    );

    assert.isUndefined(result);
    assert.equal(fromGridBySource["sensor.grid_import"][t], 10);
  });

  it("keeps bypass values when only one source can charge the battery", () => {
    const fromGridBySource = {
      "sensor.wall_connector": { [t]: 6.741 },
      "sensor.boiler": { [t]: 0.002 },
      "sensor.inverter": { [t]: 0.7 },
    };

    const result = buildCombinedUsedGrid(
      fromGridBySource,
      { [t]: 0.1 },
      { [t]: 7.343 },
      new Set(["sensor.wall_connector", "sensor.boiler"])
    );

    assert.isUndefined(result);
    assert.equal(fromGridBySource["sensor.wall_connector"][t], 6.741);
    assert.equal(fromGridBySource["sensor.boiler"][t], 0.002);
    assert.closeTo(fromGridBySource["sensor.inverter"][t], 0.6, 1e-10);
  });

  it("combines when the inferred charging-source remainder is negative", () => {
    const fromGridBySource = {
      "sensor.inverter": { [t]: 1 },
      "sensor.bypass": { [t]: 2 },
    };

    const result = buildCombinedUsedGrid(
      fromGridBySource,
      { [t]: 1.2 },
      { [t]: 1.8 },
      new Set(["sensor.bypass"])
    );

    assert.deepEqual(result, { [t]: 1.8 });
    assert.isUndefined(fromGridBySource["sensor.inverter"][t]);
    assert.isUndefined(fromGridBySource["sensor.bypass"][t]);
  });

  it("combines contradictory data when no active source can charge", () => {
    const fromGridBySource = {
      "sensor.bypass": { [t]: 3 },
    };

    const result = buildCombinedUsedGrid(
      fromGridBySource,
      { [t]: 1 },
      { [t]: 2 },
      new Set(["sensor.bypass"])
    );

    assert.deepEqual(result, { [t]: 2 });
    assert.isUndefined(fromGridBySource["sensor.bypass"][t]);
  });

  it("only clears the ambiguous period", () => {
    const later = t + 3_600_000;
    const fromGridBySource = {
      "sensor.grid_a": { [t]: 1, [later]: 4 },
      "sensor.grid_b": { [t]: 2 },
      "sensor.bypass": { [later]: 1 },
    };

    const result = buildCombinedUsedGrid(
      fromGridBySource,
      { [t]: 1, [later]: 1 },
      { [t]: 2, [later]: 4 },
      new Set(["sensor.bypass"])
    );

    assert.deepEqual(result, { [t]: 2 });
    assert.isUndefined(fromGridBySource["sensor.grid_a"][t]);
    assert.isUndefined(fromGridBySource["sensor.grid_b"][t]);
    assert.equal(fromGridBySource["sensor.grid_a"][later], 3);
    assert.equal(fromGridBySource["sensor.bypass"][later], 1);
  });
});
