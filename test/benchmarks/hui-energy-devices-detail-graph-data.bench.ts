import { bench, describe } from "vitest";
import type {
  DeviceConsumptionEnergyPreference,
  EnergyData,
  EnergyPreferences,
} from "../../src/data/energy";
import type { HomeAssistant } from "../../src/types";
import type { EnergyDevicesDetailGraphCardConfig } from "../../src/panels/lovelace/cards/types";
import { generateEnergyDevicesDetailGraphData } from "../../src/panels/lovelace/cards/energy/energy-devices-detail-graph-data";
import { createMockComputedStyle } from "../fixtures/computed-style";
import { createMockHass } from "../fixtures/hass";
import {
  generateEnergyData,
  generateEnergyPreferences,
} from "../fixtures/energy";
import { generateStatistics } from "../fixtures/statistics";

const computedStyles = createMockComputedStyle({
  "--history-unknown-color": "#888888",
});
const hass = {
  ...createMockHass(),
  themes: { darkMode: false },
} as unknown as HomeAssistant;
const now = new Date("2024-02-01T00:00:00Z");
const config: EnergyDevicesDetailGraphCardConfig = {
  type: "energy-devices-detail-graph",
};

const buildPrefs = (): EnergyPreferences => {
  const prefs = generateEnergyPreferences();
  const devices: DeviceConsumptionEnergyPreference[] = [
    { stat_consumption: "sensor.grid_consumption", name: "Grid device" },
    { stat_consumption: "sensor.solar_production", name: "Solar device" },
    { stat_consumption: "sensor.battery_discharge" },
    {
      stat_consumption: "sensor.battery_charge",
      included_in_stat: "sensor.grid_consumption",
    },
  ];
  return { ...prefs, device_consumption: devices };
};

// Many devices arranged as parents each with several children, so the
// per-point child summation has real depth (the case the original O(n^2)
// `.find` scan punishes most).
const buildHierarchyPrefs = (
  parents: number,
  childrenPerParent: number
): { prefs: EnergyPreferences; ids: string[] } => {
  const prefs = generateEnergyPreferences();
  const devices: DeviceConsumptionEnergyPreference[] = [];
  const ids: string[] = [];
  for (let p = 0; p < parents; p++) {
    const parentId = `sensor.device_${p}`;
    devices.push({ stat_consumption: parentId, name: `Device ${p}` });
    ids.push(parentId);
    for (let c = 0; c < childrenPerParent; c++) {
      const childId = `sensor.device_${p}_child_${c}`;
      devices.push({ stat_consumption: childId, included_in_stat: parentId });
      ids.push(childId);
    }
  }
  return { prefs: { ...prefs, device_consumption: devices }, ids };
};

const hierarchy = buildHierarchyPrefs(20, 5);
const hierarchyData = {
  ...generateEnergyData(9, {
    days: 31,
    period: "hour",
    prefs: hierarchy.prefs,
  }),
  // generateEnergyData only generates stats for energy_sources; add stats for
  // the device/child statistic ids so the child summation actually runs.
  stats: {
    ...generateEnergyData(9, {
      days: 31,
      period: "hour",
      prefs: hierarchy.prefs,
    }).stats,
    ...generateStatistics(99, {
      ids: hierarchy.ids,
      period: "hour",
      days: 31,
      sumStatistics: true,
    }),
  },
};

const dayHourly = generateEnergyData(1, {
  days: 1,
  period: "hour",
  prefs: buildPrefs(),
});
const weekHourly = generateEnergyData(2, {
  days: 7,
  period: "hour",
  prefs: buildPrefs(),
});
const monthFiveMinute = generateEnergyData(3, {
  days: 31,
  period: "5minute",
  compare: true,
  prefs: buildPrefs(),
});

// getSummedData/computeConsumptionData are memoizeOne-wrapped on the
// energyData object: pass a fresh shallow clone each iteration so the
// benchmark measures the real computation, not a cache hit.
const run = (data: EnergyData) =>
  generateEnergyDevicesDetailGraphData({
    hass,
    energyData: { ...data },
    config,
    computedStyles,
    now,
    untrackedOrder: now.getTime(),
  });

describe("generateEnergyDevicesDetailGraphData", () => {
  bench("day of hourly data", () => {
    run(dayHourly);
  });

  bench("week of hourly data", () => {
    run(weekHourly);
  });

  bench(
    "month of 5-minute data with compare",
    () => {
      run(monthFiveMinute);
    },
    { time: 1000, warmupIterations: 2 }
  );

  bench(
    "month of hourly data, 20 parents x 5 children",
    () => {
      run(hierarchyData as EnergyData);
    },
    { time: 1000, warmupIterations: 2 }
  );
});
