import { bench, describe } from "vitest";
import { generateStatisticsChartData } from "../../src/components/chart/statistics-chart-data";
import { StatisticMeanType } from "../../src/data/recorder";
import type { StatisticsMetaData } from "../../src/data/recorder";
import { createMockComputedStyle } from "../fixtures/computed-style";
import { createMockHass } from "../fixtures/hass";
import { FIXED_EPOCH_MS } from "../fixtures/history-states";
import { generateStatistics } from "../fixtures/statistics";

const computedStyle = createMockComputedStyle();
const hass = createMockHass();
const dayMs = 24 * 60 * 60 * 1000;

const buildMetadata = (
  ids: string[],
  unit: string,
  hasSum: boolean
): Record<string, StatisticsMetaData> =>
  Object.fromEntries(
    ids.map((id) => [
      id,
      {
        statistic_id: id,
        statistics_unit_of_measurement: unit,
        source: "recorder",
        name: null,
        has_sum: hasSum,
        mean_type: hasSum
          ? StatisticMeanType.NONE
          : StatisticMeanType.ARITHMETIC,
        unit_class: hasSum ? "energy" : "temperature",
      },
    ])
  );

const meanIds = Array.from({ length: 5 }, (_, i) => `sensor.temperature_${i}`);
const sumIds = Array.from({ length: 5 }, (_, i) => `sensor.energy_${i}`);

const meanMonth = generateStatistics(1, {
  ids: meanIds,
  period: "hour",
  days: 31,
});
const meanWeek5min = generateStatistics(2, {
  ids: meanIds,
  period: "5minute",
  days: 7,
});
const sumMonth = generateStatistics(3, {
  ids: sumIds,
  period: "hour",
  days: 31,
  sumStatistics: true,
});

const base = {
  hass,
  computedStyle,
  now: new Date(FIXED_EPOCH_MS + 31 * dayMs),
  hiddenStats: new Set<string>(),
  hideLegend: false,
} as const;

describe("generateStatisticsChartData", () => {
  bench(
    "line with bands, hourly month, 5 entities",
    () => {
      generateStatisticsChartData({
        ...base,
        statisticsData: meanMonth,
        statisticsMetaData: buildMetadata(meanIds, "°C", false),
        statTypes: ["mean", "min", "max"],
        chartType: "line",
        period: "hour",
      });
    },
    { time: 1000, warmupIterations: 2 }
  );

  bench(
    "line with bands, 5-minute week, 5 entities",
    () => {
      generateStatisticsChartData({
        ...base,
        statisticsData: meanWeek5min,
        statisticsMetaData: buildMetadata(meanIds, "°C", false),
        statTypes: ["mean", "min", "max"],
        chartType: "line",
        period: "5minute",
      });
    },
    { time: 1000, warmupIterations: 2 }
  );

  bench(
    "stacked bars, hourly month sums, 5 entities",
    () => {
      generateStatisticsChartData({
        ...base,
        statisticsData: sumMonth,
        statisticsMetaData: buildMetadata(sumIds, "kWh", true),
        statTypes: ["change"],
        chartType: "bar-stack",
        period: "hour",
      });
    },
    { time: 1000, warmupIterations: 2 }
  );
});
