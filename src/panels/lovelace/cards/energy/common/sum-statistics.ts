import type { Statistics, StatisticValue } from "../../../../../data/recorder";

// Sums several sources into one series, as if they were a single source.
export const sumEnergyStatistics = (
  stats: Statistics,
  statIds: string[]
): StatisticValue[] => {
  const summed = new Map<number, StatisticValue>();
  for (const statId of statIds) {
    let prevStart: number | undefined;
    for (const point of stats[statId] ?? []) {
      if (point.change == null || point.start === prevStart) {
        continue;
      }
      prevStart = point.start;
      const existing = summed.get(point.start);
      if (existing) {
        existing.change! += point.change;
      } else {
        summed.set(point.start, {
          start: point.start,
          end: point.end,
          change: point.change,
        });
      }
    }
  }
  return [...summed.values()].sort((a, b) => a.start - b.start);
};
