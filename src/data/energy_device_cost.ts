import type {
  EnergyData,
  EnergyInfo,
  EnergyPreferences,
  GridSourceTypeEnergyPreference,
} from "./energy";
import type { Statistics, StatisticValue } from "./recorder";

export type EnergyUnitMode = "energy" | "cost";

export const ENERGY_UNIT_MODE_STORAGE_KEY = "energy-unit-mode";

const resolveImportCostStatId = (
  source: GridSourceTypeEnergyPreference,
  info: EnergyInfo
): string | undefined => {
  if (source.stat_cost) {
    return source.stat_cost;
  }
  if (source.stat_energy_from) {
    return info.cost_sensors[source.stat_energy_from];
  }
  return undefined;
};

// Bucket-start -> cost ratio. ratio(h) = Σimport_cost(h) / Σimport_kWh(h).
// Buckets with no import energy or no cost data are omitted. Export
// compensation is intentionally excluded: it's a rebate on the bill, not a
// price of kWh consumed by devices.
export const computeGridCostRatios = (
  stats: Statistics,
  info: EnergyInfo,
  prefs: EnergyPreferences
): Map<number, number> => {
  const energyByBucket = new Map<number, number>();
  const costByBucket = new Map<number, number>();

  for (const source of prefs.energy_sources) {
    if (source.type !== "grid") {
      continue;
    }
    const grid = source;

    if (grid.stat_energy_from) {
      const energyStats = stats[grid.stat_energy_from];
      if (energyStats) {
        for (const value of energyStats) {
          if (value.change == null) {
            continue;
          }
          energyByBucket.set(
            value.start,
            (energyByBucket.get(value.start) || 0) + value.change
          );
        }
      }
    }

    const costStatId = resolveImportCostStatId(grid, info);
    if (costStatId) {
      const costStats = stats[costStatId];
      if (costStats) {
        for (const value of costStats) {
          if (value.change == null) {
            continue;
          }
          costByBucket.set(
            value.start,
            (costByBucket.get(value.start) || 0) + value.change
          );
        }
      }
    }
  }

  const ratios = new Map<number, number>();
  for (const [bucket, energy] of energyByBucket) {
    if (energy <= 0) {
      continue;
    }
    const cost = costByBucket.get(bucket);
    if (cost == null) {
      continue;
    }
    ratios.set(bucket, cost / energy);
  }
  return ratios;
};

// True iff at least one bucket has both grid import kWh and grid cost. Checks
// both live and compare stats so the availability signal is stable when only
// the compare window has data.
export const hasGridCostData = (energyData: EnergyData): boolean => {
  if (
    computeGridCostRatios(energyData.stats, energyData.info, energyData.prefs)
      .size > 0
  ) {
    return true;
  }
  if (
    energyData.statsCompare &&
    computeGridCostRatios(
      energyData.statsCompare,
      energyData.info,
      energyData.prefs
    ).size > 0
  ) {
    return true;
  }
  return false;
};

// Σ device_kWh(h) * ratio(h). Buckets without a ratio contribute 0. Returns
// null when the device stat is absent (mirrors calculateStatisticSumGrowth).
export const calculateDeviceCostGrowth = (
  stats: Statistics,
  deviceStatId: string,
  ratios: Map<number, number>
): number | null => {
  const values = stats[deviceStatId];
  if (!values) {
    return null;
  }
  let total: number | null = null;
  for (const value of values) {
    if (value.change == null) {
      continue;
    }
    const ratio = ratios.get(value.start);
    if (ratio == null) {
      continue;
    }
    total = (total ?? 0) + value.change * ratio;
  }
  return total;
};

// Synthetic StatisticValue[] with change = device_kWh(h) * ratio(h). Lets the
// detail chart's existing `for (const point of stats)` loop run unchanged.
// Buckets without a ratio emit change = 0 so the chart preserves the x-axis
// spacing.
export const deviceCostSeries = (
  stats: Statistics,
  deviceStatId: string,
  ratios: Map<number, number>
): StatisticValue[] => {
  const values = stats[deviceStatId];
  if (!values) {
    return [];
  }
  return values.map((value) => ({
    start: value.start,
    end: value.end,
    change:
      value.change == null
        ? null
        : value.change * (ratios.get(value.start) ?? 0),
  }));
};
