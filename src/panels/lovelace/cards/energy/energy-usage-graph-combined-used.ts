import { round } from "../../../../common/number/round";

/**
 * In periods where part of the sources' energy did not reach the home (grid
 * charging a battery, a battery exporting), per-source attribution is
 * ambiguous if multiple sources have data in the same period. Values that
 * round to 0 Wh are float noise from subtracting sums.
 * Rewrites single-source periods in place on `bySource`, and returns a
 * combined used map for multi-source periods. Returns undefined when no
 * combined series is needed so the chart does not add an empty legend item.
 */
export function buildCombinedUsed(
  bySource: Record<string, Record<number, number>>,
  notUsed: Record<number, number>,
  used: Record<number, number>
): Record<number, number> | undefined {
  const combined: Record<number, number> = {};
  for (const [start, notUsedInPeriod] of Object.entries(notUsed)) {
    if (!round(notUsedInPeriod, 3)) {
      continue;
    }
    let noOfSources = 0;
    let source: string | undefined;
    for (const [key, stats] of Object.entries(bySource)) {
      if (stats[start]) {
        source = key;
        noOfSources++;
      }
      if (noOfSources > 1) {
        break;
      }
    }
    if (noOfSources === 1 && source) {
      bySource[source][start] = used[start];
    } else {
      Object.values(bySource).forEach((stats) => {
        delete stats[start];
      });
      if (round(used[start], 3)) {
        combined[start] = used[start];
      }
    }
  }
  return Object.keys(combined).length > 0 ? combined : undefined;
}
