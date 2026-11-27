import { describe, expect, it } from "vitest";
import { mergeSecondaryYAxisUnits } from "../../../src/components/chart/merge-secondary-y-axis";
import type { LineChartUnit } from "../../../src/data/history";

const unit = (
  identifier: string,
  unitName: string,
  entityIds: string[]
): LineChartUnit => ({
  unit: unitName,
  identifier,
  data: entityIds.map((entity_id) => ({
    domain: "sensor",
    name: entity_id,
    entity_id,
    states: [],
  })),
});

describe("mergeSecondaryYAxisUnits", () => {
  it("returns the units unchanged when no secondary entities are configured", () => {
    const units = [unit("a", "°C", ["sensor.a"]), unit("b", "W", ["sensor.b"])];
    expect(mergeSecondaryYAxisUnits(units, undefined)).toBe(units);
    expect(mergeSecondaryYAxisUnits(units, new Set())).toBe(units);
  });

  it("merges exactly one primary and one secondary unit into a single item", () => {
    const primary = unit("a", "°C", ["sensor.temp"]);
    const secondary = unit("b", "W", ["sensor.power"]);
    const result = mergeSecondaryYAxisUnits(
      [primary, secondary],
      new Set(["sensor.power"])
    );
    expect(result).toHaveLength(1);
    expect(result[0].unit).toBe("°C");
    expect(result[0].secondary?.unit).toBe("W");
  });

  it("falls back to unmerged units when more than one unit is flagged secondary", () => {
    const primary = unit("a", "°C", ["sensor.temp"]);
    const secondaryOne = unit("b", "W", ["sensor.power"]);
    const secondaryTwo = unit("c", "kWh", ["sensor.energy"]);
    const units = [primary, secondaryOne, secondaryTwo];
    const result = mergeSecondaryYAxisUnits(
      units,
      new Set(["sensor.power", "sensor.energy"])
    );
    expect(result).toBe(units);
  });

  it("falls back to unmerged units when more than one unit is unflagged", () => {
    const primaryOne = unit("a", "°C", ["sensor.temp"]);
    const primaryTwo = unit("b", "%", ["sensor.humidity"]);
    const secondary = unit("c", "W", ["sensor.power"]);
    const units = [primaryOne, primaryTwo, secondary];
    const result = mergeSecondaryYAxisUnits(units, new Set(["sensor.power"]));
    expect(result).toBe(units);
  });
});
