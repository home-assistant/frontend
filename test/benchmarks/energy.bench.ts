import { bench, describe } from "vitest";
import type { LineSeriesOption } from "echarts/charts";
import {
  computeConsumptionData,
  computeConsumptionSingle,
  getSummedData,
} from "../../src/data/energy";
import { fillLineGaps } from "../../src/panels/lovelace/cards/energy/common/energy-chart-options";
import { generateEnergyData } from "../fixtures/energy";
import { createSeededRandom } from "../fixtures/random";
import { FIXED_EPOCH_MS } from "../fixtures/history-states";

// getSummedData and computeConsumptionData are memoizeOne-wrapped: passing
// the same object reference would only measure the cache hit. Shallow-clone
// the input each iteration to measure the real computation.
const monthHourly = generateEnergyData(1, { days: 31, period: "hour" });
const monthHourlyCompare = generateEnergyData(2, {
  days: 31,
  period: "hour",
  compare: true,
});
const summedMonth = getSummedData(
  generateEnergyData(3, { days: 31, period: "hour" })
).summedData;

const buildLineDatasets = (seed: number): LineSeriesOption[] => {
  const random = createSeededRandom(seed);
  const datasets: LineSeriesOption[] = [];
  for (let series = 0; series < 10; series++) {
    const data: [number, number][] = [];
    for (let i = 0; i < 744; i++) {
      // create gaps so fillLineGaps has buckets to fill
      if (random() < 0.3) continue;
      data.push([FIXED_EPOCH_MS + i * 3_600_000, random() * 5]);
    }
    datasets.push({ data });
  }
  return datasets;
};

describe("getSummedData", () => {
  bench("month of hourly data, full source setup", () => {
    getSummedData({ ...monthHourly });
  });

  bench("month of hourly data with compare", () => {
    getSummedData({ ...monthHourlyCompare });
  });
});

describe("computeConsumptionData", () => {
  bench("month of hourly summed data", () => {
    computeConsumptionData({ ...summedMonth }, undefined);
  });
});

describe("computeConsumptionSingle", () => {
  bench("full battery + solar flow", () => {
    computeConsumptionSingle({
      from_grid: 2,
      to_grid: 1,
      solar: 6,
      to_battery: 3,
      from_battery: 2,
    });
  });
});

describe("fillLineGaps", () => {
  bench("10 series, month of hourly buckets, 30% gaps", () => {
    fillLineGaps(buildLineDatasets(4).map((d) => ({ ...d })));
  });
});
