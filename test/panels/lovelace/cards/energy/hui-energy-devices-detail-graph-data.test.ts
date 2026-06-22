/**
 * Characterization tests pinning the exact output of the energy
 * devices-detail graph data transform. Do NOT update these snapshots to make
 * an optimization pass — see test/benchmarks/README.md.
 */
import { assert, describe, expect, it } from "vitest";
import type {
  DeviceConsumptionEnergyPreference,
  EnergyPreferences,
} from "../../../../../src/data/energy";
import type { HomeAssistant } from "../../../../../src/types";
import type { EnergyDevicesDetailGraphCardConfig } from "../../../../../src/panels/lovelace/cards/types";
import { generateEnergyDevicesDetailGraphData } from "../../../../../src/panels/lovelace/cards/energy/energy-devices-detail-graph-data";
import { createMockComputedStyle } from "../../../../fixtures/computed-style";
import { digestResult } from "../../../../fixtures/digest";
import { createMockHass } from "../../../../fixtures/hass";
import {
  generateEnergyData,
  generateEnergyPreferences,
} from "../../../../fixtures/energy";

const computedStyles = createMockComputedStyle({
  "--history-unknown-color": "#888888",
});

// createMockHass omits `themes`; getEnergyColor reads hass.themes.darkMode.
const hass = {
  ...createMockHass(),
  themes: { darkMode: false },
} as unknown as HomeAssistant;

// Fixed `now` (end fallback) and `untrackedOrder` (untracked dataset id
// suffix, `untracked-<order>`) for deterministic output. In the live card
// these come from `endOfToday()` and `Date.now()` respectively.
const now = new Date("2024-02-01T00:00:00Z");
const untrackedOrder = now.getTime();

// device_consumption referencing real energy-source stat ids so they appear in
// generateEnergyData's stats. `included_in_stat` exercises the childMap path.
const buildPrefs = (withChildren: boolean): EnergyPreferences => {
  const prefs = generateEnergyPreferences();
  const devices: DeviceConsumptionEnergyPreference[] = [
    { stat_consumption: "sensor.grid_consumption", name: "Grid device" },
    { stat_consumption: "sensor.solar_production", name: "Solar device" },
    { stat_consumption: "sensor.battery_discharge" },
  ];
  if (withChildren) {
    devices.push({
      stat_consumption: "sensor.battery_charge",
      included_in_stat: "sensor.grid_consumption",
    });
  }
  return { ...prefs, device_consumption: devices };
};

const config: EnergyDevicesDetailGraphCardConfig = {
  type: "energy-devices-detail-graph",
};

const baseParams = {
  hass,
  config,
  computedStyles,
  now,
  untrackedOrder,
} as const;

describe("generateEnergyDevicesDetailGraphData", () => {
  it("matches snapshot for a small hourly dataset (no compare)", () => {
    const energyData = generateEnergyData(1, {
      days: 1,
      period: "hour",
      prefs: buildPrefs(false),
    });
    expect(
      generateEnergyDevicesDetailGraphData({ ...baseParams, energyData })
    ).toMatchSnapshot();
  });

  it("matches snapshot with compare data (untracked compare path)", () => {
    const energyData = generateEnergyData(2, {
      days: 1,
      period: "hour",
      compare: true,
      prefs: buildPrefs(false),
    });
    expect(
      generateEnergyDevicesDetailGraphData({ ...baseParams, energyData })
    ).toMatchSnapshot();
  });

  it("matches snapshot with child devices (included_in_stat path)", () => {
    const energyData = generateEnergyData(3, {
      days: 1,
      period: "hour",
      prefs: buildPrefs(true),
    });
    expect(
      generateEnergyDevicesDetailGraphData({ ...baseParams, energyData })
    ).toMatchSnapshot();
  });

  it("matches snapshot for 5minute period (period offset path)", () => {
    const energyData = generateEnergyData(4, {
      days: 1,
      period: "5minute",
      prefs: buildPrefs(false),
    });
    expect(
      generateEnergyDevicesDetailGraphData({ ...baseParams, energyData })
    ).toMatchSnapshot();
  });

  it("matches snapshot for daily period (no period offset)", () => {
    const energyData = generateEnergyData(5, {
      days: 7,
      period: "day",
      prefs: buildPrefs(false),
    });
    expect(
      generateEnergyDevicesDetailGraphData({ ...baseParams, energyData })
    ).toMatchSnapshot();
  });

  it("respects max_devices config", () => {
    const energyData = generateEnergyData(6, {
      days: 1,
      period: "hour",
      prefs: buildPrefs(false),
    });
    expect(
      generateEnergyDevicesDetailGraphData({
        ...baseParams,
        config: { ...config, max_devices: 2 },
        energyData,
      })
    ).toMatchSnapshot();
  });

  it("large month-of-hourly digest is stable (no compare)", () => {
    const energyData = generateEnergyData(7, {
      days: 31,
      period: "hour",
      prefs: buildPrefs(true),
    });
    expect(
      digestResult(
        generateEnergyDevicesDetailGraphData({ ...baseParams, energyData })
      )
    ).toMatchSnapshot();
  });

  it("large month-of-hourly digest is stable (with compare)", () => {
    const energyData = generateEnergyData(8, {
      days: 31,
      period: "hour",
      compare: true,
      prefs: buildPrefs(true),
    });
    expect(
      digestResult(
        generateEnergyDevicesDetailGraphData({ ...baseParams, energyData })
      )
    ).toMatchSnapshot();
  });

  // The seeded fixtures above all happen to produce fully-negative untracked
  // (devices reference the source stats, so they consume all of used_total).
  // These two cases pin the branches those snapshots can't reach.
  describe("negative untracked series", () => {
    const NEGATIVE_NAME =
      "ui.panel.lovelace.cards.energy.energy_devices_detail_graph.over_reported_consumption";

    const isNegativeSeries = (id: unknown) =>
      typeof id === "string" && id.includes("untracked-negative");

    it("omits the over-reported series when untracked is all positive", () => {
      // Grid-only with no export keeps used_total >= 0, and the device
      // references a stat with no data, so untracked == used_total >= 0.
      const gridPrefs = generateEnergyPreferences({ grid: true });
      const prefs: EnergyPreferences = {
        ...gridPrefs,
        energy_sources: gridPrefs.energy_sources.map((s) =>
          s.type === "grid" ? { ...s, stat_energy_to: null } : s
        ),
        device_consumption: [
          { stat_consumption: "sensor.device_without_stats", name: "Phantom" },
        ],
      };
      const energyData = generateEnergyData(9, {
        days: 1,
        period: "hour",
        prefs,
      });
      const result = generateEnergyDevicesDetailGraphData({
        ...baseParams,
        energyData,
      });

      // No negative series and no extra legend item for clean data.
      assert.isFalse(result.chartData.some((d) => isNegativeSeries(d.id)));
      assert.isUndefined(
        result.legendData?.find((l) => l.name === NEGATIVE_NAME)
      );

      // The positive untracked series still carries the genuine (>= 0) values.
      const untracked = result.chartData.find(
        (d) =>
          typeof d.id === "string" &&
          d.id.startsWith("untracked-") &&
          !isNegativeSeries(d.id)
      );
      assert.exists(untracked);
      const ys = (untracked!.data as any[]).map((p) => p.value?.[1] ?? p?.[1]);
      assert.isTrue(ys.every((y) => y >= 0));
      assert.isTrue(ys.some((y) => y > 0));
    });

    it("adds a toggleable over-reported series when negatives exist", () => {
      // buildPrefs devices reference the source stats -> negative untracked.
      const energyData = generateEnergyData(1, {
        days: 1,
        period: "hour",
        prefs: buildPrefs(false),
      });
      const result = generateEnergyDevicesDetailGraphData({
        ...baseParams,
        energyData,
      });

      const negative = result.chartData.find((d) => isNegativeSeries(d.id));
      assert.exists(negative);
      // It carries negative values and shares the devices stack.
      const ys = (negative!.data as any[]).map((p) => p.value?.[1] ?? p?.[1]);
      assert.isTrue(ys.some((y) => y < 0));
      assert.equal(negative!.stack, "devices");

      // The positive untracked is clamped to >= 0 (negatives moved to the
      // separate series).
      const untracked = result.chartData.find(
        (d) =>
          typeof d.id === "string" &&
          d.id.startsWith("untracked-") &&
          !isNegativeSeries(d.id)
      );
      const posYs = (untracked!.data as any[]).map(
        (p) => p.value?.[1] ?? p?.[1]
      );
      assert.isTrue(posYs.every((y) => y >= 0));

      // A dedicated, non-clickable legend item paired with the compare series.
      const legend = result.legendData?.find((l) => l.name === NEGATIVE_NAME);
      assert.exists(legend);
      assert.equal(legend!.id, negative!.id);
      assert.isTrue(legend!.noLabelClick);
      assert.deepEqual(legend!.secondaryIds, [`compare-${negative!.id}`]);
    });
  });
});
