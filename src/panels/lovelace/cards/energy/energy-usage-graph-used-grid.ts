import type { EnergySource } from "../../../../data/energy";

export function getNonBatteryChargingGridStats(
  sources: EnergySource[]
): Set<string> {
  const stats = new Set<string>();
  for (const source of sources) {
    if (
      source.type === "grid" &&
      source.can_charge_battery === false &&
      source.stat_energy_from
    ) {
      stats.add(source.stat_energy_from);
    }
  }
  return stats;
}

/**
 * When battery is charging from grid, per-source import attribution is
 * ambiguous unless only one active source can charge the battery. Rewrites
 * attributable periods in place on `fromGridBySource`, and returns a combined
 * used-grid map for ambiguous periods. Returns undefined when no combined
 * series is needed so the chart does not add an empty legend item.
 */
export function buildCombinedUsedGrid(
  fromGridBySource: Record<string, Record<number, number>>,
  gridToBattery: Record<number, number>,
  usedGrid: Record<number, number>,
  nonBatteryChargingGridStats: ReadonlySet<string>
): Record<number, number> | undefined {
  const used_grid: Record<number, number> = {};
  for (const [start, grid_to_battery] of Object.entries(gridToBattery)) {
    if (!grid_to_battery) {
      continue;
    }
    const activeSources: string[] = [];
    const batteryChargingSources: string[] = [];
    for (const [key, stats] of Object.entries(fromGridBySource)) {
      if (stats[start]) {
        activeSources.push(key);
        if (!nonBatteryChargingGridStats.has(key)) {
          batteryChargingSources.push(key);
        }
      }
    }

    let resolved = false;
    if (batteryChargingSources.length === 1) {
      const batteryChargingSource = batteryChargingSources[0];
      const otherSources = activeSources.reduce(
        (sum, source) =>
          source === batteryChargingSource
            ? sum
            : sum + fromGridBySource[source][start],
        0
      );
      const remainder = usedGrid[start] - otherSources;
      if (remainder >= 0) {
        fromGridBySource[batteryChargingSource][start] = remainder;
        resolved = true;
      }
    }

    if (!resolved) {
      Object.values(fromGridBySource).forEach((stats) => {
        delete stats[start];
      });
      used_grid[start] = usedGrid[start];
    }
  }
  return Object.keys(used_grid).length > 0 ? used_grid : undefined;
}
