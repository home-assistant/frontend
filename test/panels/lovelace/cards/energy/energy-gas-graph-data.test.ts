/**
 * Characterization tests pinning the exact output of the gas energy graph
 * card's data transform. Do NOT update these snapshots to make an
 * optimization pass — see test/benchmarks/README.md.
 */
import { describe, expect, it } from "vitest";
import { generateEnergyGasGraphData } from "../../../../../src/panels/lovelace/cards/energy/energy-gas-graph-data";
import type { EnergyPreferences } from "../../../../../src/data/energy";
import type { HomeAssistant } from "../../../../../src/types";
import { createMockComputedStyle } from "../../../../fixtures/computed-style";
import { digestResult } from "../../../../fixtures/digest";
import {
  createMockEntityState,
  createMockHass,
} from "../../../../fixtures/hass";
import {
  generateEnergyData,
  generateEnergyPreferences,
} from "../../../../fixtures/energy";

// getEnergyColor resolves "--energy-gas-color" (and per-index variants) from
// the computed style, so supply a deterministic base color for the palette.
const computedStyles = createMockComputedStyle({
  "--energy-gas-color": "#1b7ea0",
});

// The transform reads hass.themes.darkMode and hass.states (via
// getStatisticLabel). createMockHass covers states; layer themes on top.
const makeHass = (overrides: Partial<HomeAssistant> = {}): HomeAssistant =>
  ({
    ...createMockHass(),
    themes: { darkMode: false },
    ...overrides,
  }) as unknown as HomeAssistant;

// Energy preferences with only gas sources (the card filters to type "gas").
const gasOnlyPrefs = (sources: number): EnergyPreferences => ({
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

// Fixed "now" so the end fallback is deterministic.
const now = new Date("2024-01-31T23:59:59Z");

describe("generateEnergyGasGraphData", () => {
  it("matches snapshot for a single gas source (no compare)", () => {
    const energyData = generateEnergyData(1, {
      days: 2,
      period: "hour",
      prefs: gasOnlyPrefs(1),
    });
    expect(
      generateEnergyGasGraphData({
        hass: makeHass(),
        energyData,
        computedStyles,
        now,
      })
    ).toMatchSnapshot();
  });

  it("matches snapshot for multiple gas sources (color brightening by idx)", () => {
    const energyData = generateEnergyData(2, {
      days: 2,
      period: "hour",
      prefs: gasOnlyPrefs(3),
    });
    expect(
      generateEnergyGasGraphData({
        hass: makeHass(),
        energyData,
        computedStyles,
        now,
      })
    ).toMatchSnapshot();
  });

  it("matches snapshot with compare data", () => {
    const energyData = generateEnergyData(3, {
      days: 2,
      period: "hour",
      compare: true,
      prefs: gasOnlyPrefs(2),
    });
    expect(
      generateEnergyGasGraphData({
        hass: makeHass(),
        energyData,
        computedStyles,
        now,
      })
    ).toMatchSnapshot();
  });

  it("matches snapshot in dark mode", () => {
    const energyData = generateEnergyData(4, {
      days: 2,
      period: "hour",
      prefs: gasOnlyPrefs(2),
    });
    expect(
      generateEnergyGasGraphData({
        hass: makeHass({
          themes: { darkMode: true } as HomeAssistant["themes"],
        }),
        energyData,
        computedStyles,
        now,
      })
    ).toMatchSnapshot();
  });

  it("uses the source name when provided, and the entity name from hass.states", () => {
    const prefs: EnergyPreferences = {
      energy_sources: [
        {
          type: "gas",
          stat_energy_from: "sensor.gas_named",
          name: "My gas meter",
          stat_cost: null,
          entity_energy_price: null,
          number_energy_price: null,
        },
        {
          type: "gas",
          stat_energy_from: "sensor.gas_from_state",
          stat_cost: null,
          entity_energy_price: null,
          number_energy_price: null,
        },
      ],
      device_consumption: [],
      device_consumption_water: [],
    };
    const energyData = generateEnergyData(5, {
      days: 2,
      period: "hour",
      prefs,
    });
    const hass = makeHass({
      states: {
        "sensor.gas_from_state": createMockEntityState(
          "sensor.gas_from_state",
          "42",
          { friendly_name: "Kitchen gas" }
        ),
      } as HomeAssistant["states"],
    });
    expect(
      generateEnergyGasGraphData({ hass, energyData, computedStyles, now })
    ).toMatchSnapshot();
  });

  it("handles no gas sources (empty placeholder dataset)", () => {
    const energyData = generateEnergyData(6, {
      days: 2,
      period: "hour",
      prefs: generateEnergyPreferences({ grid: true, solar: true }),
    });
    expect(
      generateEnergyGasGraphData({
        hass: makeHass(),
        energyData,
        computedStyles,
        now,
      })
    ).toMatchSnapshot();
  });

  it("falls back to now when energyData.end is missing", () => {
    const energyData = generateEnergyData(7, {
      days: 1,
      period: "hour",
      prefs: gasOnlyPrefs(1),
    });
    // Force the missing-end branch.
    (energyData as { end?: Date }).end = undefined;
    const result = generateEnergyGasGraphData({
      hass: makeHass(),
      energyData,
      computedStyles,
      now,
    });
    expect(result.end).toBe(now);
  });

  it("large 5-minute payload digest is stable (compare)", () => {
    const energyData = generateEnergyData(42, {
      days: 31,
      period: "5minute",
      compare: true,
      prefs: gasOnlyPrefs(3),
    });
    expect(
      digestResult(
        generateEnergyGasGraphData({
          hass: makeHass(),
          energyData,
          computedStyles,
          now,
        })
      )
    ).toMatchSnapshot();
  });
});
