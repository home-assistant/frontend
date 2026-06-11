import { bench, describe } from "vitest";
import type { BarSeriesOption } from "echarts/types/dist/shared";
import { fillDataGapsAndRoundCaps } from "../../src/components/chart/round-caps";
import { computeYAxisFractionDigits } from "../../src/components/chart/y-axis-fraction-digits";
import { FIXED_EPOCH_MS } from "../fixtures/history-states";
import { createSeededRandom } from "../fixtures/random";

const buildBarDatasets = (
  seed: number,
  stacked: boolean
): BarSeriesOption[] => {
  const random = createSeededRandom(seed);
  const datasets: BarSeriesOption[] = [];
  for (let series = 0; series < 8; series++) {
    const data: [number, number][] = [];
    for (let i = 0; i < 744; i++) {
      if (random() < 0.2) continue; // gaps to fill
      data.push([
        FIXED_EPOCH_MS + i * 3_600_000,
        (random() - 0.3) * 5, // mix of positive and negative bars
      ]);
    }
    datasets.push({
      data,
      stack: stacked ? `stack-${series % 2}` : undefined,
    });
  }
  return datasets;
};

describe("fillDataGapsAndRoundCaps", () => {
  // fillDataGapsAndRoundCaps mutates its input, so rebuild per iteration;
  // build cost is included in both baseline and comparison runs.
  bench("stacked, 8 series, month of hourly bars", () => {
    fillDataGapsAndRoundCaps(buildBarDatasets(1, true), true);
  });

  bench("non-stacked, 8 series, month of hourly bars", () => {
    fillDataGapsAndRoundCaps(buildBarDatasets(2, false), false);
  });
});

describe("computeYAxisFractionDigits", () => {
  bench("typical ranges", () => {
    computeYAxisFractionDigits(0, 100);
    computeYAxisFractionDigits(1.85, 2.0);
    computeYAxisFractionDigits(0, 0.005);
  });
});
