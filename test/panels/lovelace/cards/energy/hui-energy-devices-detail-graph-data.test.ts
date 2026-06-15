/**
 * Characterization tests pinning the exact output of the energy
 * devices-detail graph data transform. Do NOT update these snapshots to make
 * an optimization pass — see test/benchmarks/README.md.
 */
import { describe, expect, it } from "vitest";
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
});
