import type {
  DeviceConsumptionEnergyPreference,
  EnergyData,
  EnergyInfo,
  EnergyPreferences,
  GridSourceTypeEnergyPreference,
} from "./energy";
import type { Statistics } from "./recorder";

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

// Period-wide average cost ratio: Σimport_cost / Σimport_kWh over every bucket
// in `stats`. Used as a fallback when per-hour ratios are missing (e.g. hours
// where grid import was 0 because solar covered everything, but we still want
// to price the untracked residual at something sensible).
export const computePeriodAverageRatio = (
  stats: Statistics,
  info: EnergyInfo,
  prefs: EnergyPreferences
): number => {
  let totalEnergy = 0;
  let totalCost = 0;
  for (const source of prefs.energy_sources) {
    if (source.type !== "grid") {
      continue;
    }
    if (source.stat_energy_from) {
      const energyStats = stats[source.stat_energy_from];
      if (energyStats) {
        for (const value of energyStats) {
          if (value.change != null) {
            totalEnergy += value.change;
          }
        }
      }
    }
    const costStatId = resolveImportCostStatId(source, info);
    if (costStatId) {
      const costStats = stats[costStatId];
      if (costStats) {
        for (const value of costStats) {
          if (value.change != null) {
            totalCost += value.change;
          }
        }
      }
    }
  }
  return totalEnergy > 0 ? totalCost / totalEnergy : 0;
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

// Per-hour cost of the "untracked" residual: used_total(h) minus the sum of
// tracked device consumption that hour, priced at grid rate. Buckets where
// tracked > used_total are clamped to 0 so we never subtract cost. When a
// bucket has no per-hour ratio (e.g. grid import was 0 that hour because
// solar covered it), fall back to the period-average ratio so untracked
// energy still gets priced at something sensible.
export const calculateUntrackedCost = (
  stats: Statistics,
  ratios: Map<number, number>,
  usedTotalPerHour: Record<string, number>,
  devices: DeviceConsumptionEnergyPreference[],
  fallbackRatio = 0
): number => {
  // Pre-build one Map<start, change> per device so the per-hour inner loop
  // is O(1) lookups instead of O(n) linear searches.
  const deviceBuckets: Map<number, number>[] = [];
  for (const device of devices) {
    const deviceStats = stats[device.stat_consumption];
    if (!deviceStats) {
      continue;
    }
    const map = new Map<number, number>();
    for (const v of deviceStats) {
      if (v.change != null) {
        map.set(v.start, v.change);
      }
    }
    deviceBuckets.push(map);
  }
  let total = 0;
  for (const [timeStr, hourUsedTotal] of Object.entries(usedTotalPerHour)) {
    const time = Number(timeStr);
    const ratio = ratios.get(time) ?? fallbackRatio;
    if (ratio === 0) {
      continue;
    }
    let trackedThisHour = 0;
    for (const map of deviceBuckets) {
      trackedThisHour += map.get(time) ?? 0;
    }
    const untrackedKwh = hourUsedTotal - trackedThisHour;
    if (untrackedKwh > 0) {
      total += untrackedKwh * ratio;
    }
  }
  return total;
};
