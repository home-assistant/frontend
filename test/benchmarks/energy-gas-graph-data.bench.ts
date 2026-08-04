import { bench, describe } from "vitest";
import { generateEnergyGasGraphData } from "../../src/panels/lovelace/cards/energy/energy-gas-graph-data";
import type { EnergyPreferences } from "../../src/data/energy";
import { createMockComputedStyle } from "../fixtures/computed-style";
import { createMockHass } from "../fixtures/hass";
import { generateEnergyData } from "../fixtures/energy";

// getEnergyColor resolves "--energy-gas-color" (and per-index variants) from
// the computed style; supply a deterministic base color so the palette
// expands to valid hex instead of throwing on an empty string.
const computedStyles = createMockComputedStyle({
  "--energy-gas-color": "#1b7ea0",
});
const hass = {
  ...createMockHass(),
  themes: { darkMode: false },
} as any;

const now = new Date("2024-02-15T00:00:00Z");

// Gas-only preferences with several sources to exercise the per-source loop.
const gasPrefs = (sources: number): EnergyPreferences => ({
  energy_sources: Array.from({ length: sources }, (_, i) => ({
    type: "gas" as const,
    stat_energy_from: `sensor.gas_consumption_${i}`,
    stat_cost: null,
    entity_energy_price: null,
    number_energy_price: null,
  })),
  device_consumption: [],
  device_consumption_water: [],
});

const small = generateEnergyData(1, {
  days: 1,
  period: "hour",
  prefs: gasPrefs(2),
});
const medium = generateEnergyData(2, {
  days: 31,
  period: "hour",
  compare: true,
  prefs: gasPrefs(3),
});
const large = generateEnergyData(3, {
  days: 31,
  period: "5minute",
  compare: true,
  prefs: gasPrefs(4),
});

describe("generateEnergyGasGraphData", () => {
  bench("small (1 day hourly, 2 sources)", () => {
    generateEnergyGasGraphData({
      hass,
      energyData: small,
      computedStyles,
      now,
    });
  });

  bench("medium (month hourly + compare, 3 sources)", () => {
    generateEnergyGasGraphData({
      hass,
      energyData: medium,
      computedStyles,
      now,
    });
  });

  bench(
    "large (month 5-minute + compare, 4 sources)",
    () => {
      generateEnergyGasGraphData({
        hass,
        energyData: large,
        computedStyles,
        now,
      });
    },
    { time: 1000, warmupIterations: 2 }
  );
});
