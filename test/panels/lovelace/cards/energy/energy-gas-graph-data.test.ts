/**
 * Characterization tests pinning the exact output of the gas energy graph
 * card's data transform. Do NOT update these snapshots to make an
 * optimization pass — see test/benchmarks/README.md.
 */
import { describe, expect, it } from "vitest";
import type { BarSeriesOption } from "echarts/charts";
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

  // Regression tests for #52938: sparse statistics (e.g. a meter that reports
  // once per day) must be zero-filled across the whole range, otherwise
  // ECharts derives the bar band width from the data gaps — a lone bucket
  // makes it expand the time axis by ±40% of its span and draw an oversized
  // bar.
  describe("sparse data zero-fill", () => {
    const HOUR = 60 * 60 * 1000;

    const keepBuckets = (
      energyData: ReturnType<typeof generateEnergyData>,
      hourOffsets: number[]
    ) => {
      const startMs = energyData.start.getTime();
      const keep = new Set(hourOffsets.map((h) => startMs + h * HOUR));
      return {
        ...energyData,
        stats: Object.fromEntries(
          Object.entries(energyData.stats).map(([id, rows]) => [
            id,
            rows.filter((row) => keep.has(row.start)),
          ])
        ),
      };
    };

    const getX = (item: any): number => Number(item?.value?.[0] ?? item?.[0]);
    const getY = (item: any): number => Number(item?.value?.[1] ?? item?.[1]);

    it("fills the full day grid around a single mid-day bucket", () => {
      const energyData = keepBuckets(
        generateEnergyData(8, {
          days: 1,
          period: "hour",
          prefs: gasOnlyPrefs(1),
        }),
        [10]
      );
      const result = generateEnergyGasGraphData({
        hass: makeHass(),
        energyData,
        computedStyles,
        now,
      });

      const main = result.chartData.find(
        (dataset) => dataset.id === "sensor.gas_consumption_0"
      )!;
      assertDenseGrid(main.data!, 24, HOUR);
      const nonZero = main.data!.filter((item) => getY(item) !== 0);
      expect(nonZero).toHaveLength(1);
      // The real bar stays centered on its bucket midpoint.
      expect(getX(nonZero[0])).toBe(energyData.start.getTime() + 10.5 * HOUR);
      // The compare placeholder stays empty (no-data detection).
      const placeholder = result.chartData.find((dataset) =>
        String(dataset.id).startsWith("compare-")
      )!;
      expect(placeholder.data).toHaveLength(0);
    });

    it("fills the gaps between sparse readings", () => {
      const energyData = keepBuckets(
        generateEnergyData(9, {
          days: 1,
          period: "hour",
          prefs: gasOnlyPrefs(1),
        }),
        [2, 14]
      );
      const result = generateEnergyGasGraphData({
        hass: makeHass(),
        energyData,
        computedStyles,
        now,
      });

      const main = result.chartData.find(
        (dataset) => dataset.id === "sensor.gas_consumption_0"
      )!;
      assertDenseGrid(main.data!, 24, HOUR);
      expect(main.data!.filter((item) => getY(item) !== 0)).toHaveLength(2);
    });

    it("keeps datasets empty when there is no data at all", () => {
      const energyData = keepBuckets(
        generateEnergyData(10, {
          days: 1,
          period: "hour",
          prefs: gasOnlyPrefs(1),
        }),
        []
      );
      const result = generateEnergyGasGraphData({
        hass: makeHass(),
        energyData,
        computedStyles,
        now,
      });

      for (const dataset of result.chartData) {
        expect(dataset.data).toHaveLength(0);
      }
    });

    it("propagates the grid to compare datasets", () => {
      const dayMs = 24 * HOUR;
      const base = generateEnergyData(11, {
        days: 1,
        period: "hour",
        compare: true,
        prefs: gasOnlyPrefs(1),
      });
      const energyData = {
        ...keepBuckets(base, [10]),
        // The fixture doesn't set the compare range; provide it so compare
        // rows are day-shifted onto the main axis like in the real dashboard.
        startCompare: new Date(base.start.getTime() - dayMs),
        endCompare: new Date(base.start.getTime()),
      };
      const result = generateEnergyGasGraphData({
        hass: makeHass(),
        energyData,
        computedStyles,
        now,
      });

      const compare = result.chartData.find(
        (dataset) => dataset.id === "compare-sensor.gas_consumption_0"
      )!;
      // Compare data is dense here, but it must be aligned to the same
      // 24-bucket grid as the zero-filled main series.
      assertDenseGrid(compare.data!, 24, HOUR);
      const main = result.chartData.find(
        (dataset) => dataset.id === "sensor.gas_consumption_0"
      )!;
      assertDenseGrid(main.data!, 24, HOUR);
    });

    function assertDenseGrid(
      data: NonNullable<BarSeriesOption["data"]>,
      length: number,
      gap: number
    ) {
      expect(data).toHaveLength(length);
      const xs = data.map((item) => getX(item));
      expect(new Set(xs).size).toBe(length);
      const sorted = [...xs].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i] - sorted[i - 1]).toBe(gap);
      }
    }
  });
});
