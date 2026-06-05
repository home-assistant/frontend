import { describe, expect, it } from "vitest";
import type {
  EnergyPreferences,
  EnergySource,
} from "../../../../src/data/energy";
import {
  applicableEnergyCardKeys,
  ENERGY_CARD_CATALOG,
  energyCardKey,
  isEnergyCardHidden,
  isEnergyViewEmpty,
} from "../../../../src/panels/energy/strategies/energy-cards";

const source = (s: Partial<EnergySource> & { type: string }): EnergySource =>
  s as unknown as EnergySource;

const makePrefs = (
  prefs: Partial<EnergyPreferences> = {}
): EnergyPreferences => ({
  energy_sources: [],
  device_consumption: [],
  device_consumption_water: [],
  ...prefs,
});

const GRID_RETURN = source({
  type: "grid",
  stat_energy_from: "sensor.grid_in",
  stat_energy_to: "sensor.grid_out",
});
const SOLAR = source({ type: "solar", stat_energy_from: "sensor.solar" });
const GAS = source({ type: "gas", stat_energy_from: "sensor.gas" });
const WATER = source({ type: "water", stat_energy_from: "sensor.water" });

describe("energyCardKey", () => {
  it("joins the view path and card type", () => {
    expect(energyCardKey("electricity", "energy-solar-graph")).toBe(
      "electricity.energy-solar-graph"
    );
    expect(energyCardKey("now", "power-sankey")).toBe("now.power-sankey");
  });
});

describe("isEnergyCardHidden", () => {
  it("returns true only when the composite key is in the hidden list", () => {
    const hidden = ["electricity.energy-solar-graph"];
    expect(
      isEnergyCardHidden("electricity", "energy-solar-graph", hidden)
    ).toBe(true);
    // Same card type in a different view is independent.
    expect(isEnergyCardHidden("overview", "energy-solar-graph", hidden)).toBe(
      false
    );
    expect(
      isEnergyCardHidden("electricity", "energy-usage-graph", hidden)
    ).toBe(false);
  });

  it("treats undefined/empty hidden lists as nothing hidden", () => {
    expect(
      isEnergyCardHidden("electricity", "energy-solar-graph", undefined)
    ).toBe(false);
    expect(isEnergyCardHidden("electricity", "energy-solar-graph", [])).toBe(
      false
    );
  });
});

describe("catalog applicability", () => {
  it("only lists cards relevant to the configured sources", () => {
    const gasOnly = makePrefs({ energy_sources: [GAS] });
    expect(applicableEnergyCardKeys("gas", gasOnly)).toEqual([
      "gas.energy-gas-graph",
      "gas.energy-sources-table",
    ]);
    // No electricity sources -> no electricity cards apply.
    expect(applicableEnergyCardKeys("electricity", gasOnly)).toEqual([]);
  });

  it("gates the solar graph and gauges on their sources", () => {
    const solarGraph = ENERGY_CARD_CATALOG.find(
      (c) => c.key === "electricity.energy-solar-graph"
    )!;
    expect(
      solarGraph.isApplicable(makePrefs({ energy_sources: [SOLAR] }))
    ).toBe(true);
    expect(
      solarGraph.isApplicable(makePrefs({ energy_sources: [GRID_RETURN] }))
    ).toBe(false);

    const neutralityGauge = ENERGY_CARD_CATALOG.find(
      (c) => c.key === "electricity.energy-grid-neutrality-gauge"
    )!;
    // Needs grid export (return).
    expect(
      neutralityGauge.isApplicable(makePrefs({ energy_sources: [GRID_RETURN] }))
    ).toBe(true);
    expect(
      neutralityGauge.isApplicable(makePrefs({ energy_sources: [SOLAR] }))
    ).toBe(false);
  });
});

describe("isEnergyViewEmpty", () => {
  const prefs = makePrefs({ energy_sources: [WATER] });

  it("is false when no cards in the view are hidden", () => {
    expect(isEnergyViewEmpty("water", prefs, undefined)).toBe(false);
  });

  it("is false when only some applicable cards are hidden", () => {
    expect(
      isEnergyViewEmpty("water", prefs, ["water.energy-water-graph"])
    ).toBe(false);
  });

  it("is true when every applicable card is hidden", () => {
    expect(
      isEnergyViewEmpty("water", prefs, [
        "water.energy-water-graph",
        "water.energy-sources-table",
      ])
    ).toBe(true);
  });

  it("is false when the view has no applicable cards at all", () => {
    // Water source configured, but the gas view has nothing applicable.
    expect(isEnergyViewEmpty("gas", prefs, [])).toBe(false);
  });
});
