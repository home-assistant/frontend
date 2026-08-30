/**
 * When battery is charging from grid, per-source import attribution is
 * ambiguous if multiple grid sources have data in the same period.
 * Rewrites single-source periods in place on `fromGridBySource`, and returns
 * a combined used-grid map for multi-source periods. Returns undefined when
 * no combined series is needed so the chart does not add an empty legend item.
 */
export function buildCombinedUsedGrid(
  fromGridBySource: Record<string, Record<number, number>>,
  gridToBattery: Record<number, number>,
  usedGrid: Record<number, number>
): Record<number, number> | undefined {
  const used_grid: Record<number, number> = {};
  for (const [start, grid_to_battery] of Object.entries(gridToBattery)) {
    if (!grid_to_battery) {
      continue;
    }
    let noOfSources = 0;
    let source: string | undefined;
    for (const [key, stats] of Object.entries(fromGridBySource)) {
      if (stats[start]) {
        source = key;
        noOfSources++;
      }
      if (noOfSources > 1) {
        break;
      }
    }
    if (noOfSources === 1 && source) {
      fromGridBySource[source][start] = usedGrid[start];
    } else {
      Object.values(fromGridBySource).forEach((stats) => {
        delete stats[start];
      });
      used_grid[start] = usedGrid[start];
    }
  }
  return Object.keys(used_grid).length > 0 ? used_grid : undefined;
}
