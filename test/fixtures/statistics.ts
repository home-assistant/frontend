/**
 * Deterministic generators for the `Statistics` format (src/data/recorder.ts).
 * Anchored at FIXED_EPOCH_MS; timestamps are milliseconds.
 */
import type { Statistics, StatisticValue } from "../../src/data/recorder";
import { FIXED_EPOCH_MS } from "./history-states";
import { createSeededRandom } from "./random";

const PERIOD_MS = {
  "5minute": 5 * 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
} as const;

export interface StatisticsOptions {
  ids: string[];
  period: keyof typeof PERIOD_MS;
  days: number;
  startMs?: number;
  /** Probability that a period is missing entirely (creates gaps) */
  gapChance?: number;
  /** Generate sum/change (energy-style) instead of mean/min/max */
  sumStatistics?: boolean;
}

export const generateStatistics = (
  seed: number,
  options: StatisticsOptions
): Statistics => {
  const {
    ids,
    period,
    days,
    startMs = FIXED_EPOCH_MS,
    gapChance = 0.02,
    sumStatistics = false,
  } = options;
  const periodMs = PERIOD_MS[period];
  const count = Math.floor((days * 24 * 60 * 60 * 1000) / periodMs);
  const statistics: Statistics = {};

  ids.forEach((id, idIndex) => {
    const random = createSeededRandom(seed + idIndex * 1000);
    const values: StatisticValue[] = [];
    let level = 20 + random() * 10;
    let sum = 0;

    for (let i = 0; i < count; i++) {
      if (random() < gapChance) {
        continue;
      }
      const start = startMs + i * periodMs;
      const value: StatisticValue = { start, end: start + periodMs };
      if (sumStatistics) {
        const change = random() * 2;
        sum += change;
        value.change = Number(change.toFixed(3));
        value.sum = Number(sum.toFixed(3));
        value.state = Number(sum.toFixed(3));
      } else {
        level = Math.max(0, level + (random() - 0.5) * 4);
        const spread = random() * 3;
        value.mean = Number(level.toFixed(3));
        value.min = Number((level - spread).toFixed(3));
        value.max = Number((level + spread).toFixed(3));
      }
      values.push(value);
    }
    statistics[id] = values;
  });

  return statistics;
};
