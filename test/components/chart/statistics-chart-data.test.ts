/**
 * Characterization tests pinning the exact output of the statistics chart
 * data transform. Do NOT update these snapshots to make an optimization
 * pass — see test/benchmarks/README.md.
 */
import { describe, expect, it } from "vitest";
import { generateStatisticsChartData } from "../../../src/components/chart/statistics-chart-data";
import { StatisticMeanType } from "../../../src/data/recorder";
import type { StatisticsMetaData } from "../../../src/data/recorder";
import { createMockComputedStyle } from "../../fixtures/computed-style";
import { digestResult } from "../../fixtures/digest";
import { createMockEntityState, createMockHass } from "../../fixtures/hass";
import { FIXED_EPOCH_MS } from "../../fixtures/history-states";
import { generateStatistics } from "../../fixtures/statistics";

const computedStyle = createMockComputedStyle();
const dayMs = 24 * 60 * 60 * 1000;
const now = new Date(FIXED_EPOCH_MS + 7 * dayMs);

const buildMetadata = (
  ids: string[],
  unit = "°C",
  hasSum = false
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

describe("generateStatisticsChartData", () => {
  const meanIds = ["sensor.temp_indoor", "sensor.temp_outdoor"];
  const sumIds = ["sensor.energy_a", "sensor.energy_b"];

  const baseParams = {
    hass: createMockHass(),
    computedStyle,
    now,
    hiddenStats: new Set<string>(),
    hideLegend: false,
  } as const;

  it("returns undefined for empty statistics", () => {
    expect(
      generateStatisticsChartData({
        ...baseParams,
        statisticsData: {},
        statisticsMetaData: {},
        statTypes: ["mean"],
        chartType: "line",
      })
    ).toBeUndefined();
  });

  it("matches snapshot for a line chart with min/mean/max bands", () => {
    expect(
      generateStatisticsChartData({
        ...baseParams,
        statisticsData: generateStatistics(1, {
          ids: meanIds,
          period: "hour",
          days: 1,
        }),
        statisticsMetaData: buildMetadata(meanIds),
        statTypes: ["mean", "min", "max"],
        chartType: "line",
        period: "hour",
      })
    ).toMatchSnapshot();
  });

  it("matches snapshot for a bar chart with sum statistics", () => {
    expect(
      generateStatisticsChartData({
        ...baseParams,
        statisticsData: generateStatistics(2, {
          ids: sumIds,
          period: "hour",
          days: 1,
          sumStatistics: true,
        }),
        statisticsMetaData: buildMetadata(sumIds, "kWh", true),
        statTypes: ["sum"],
        chartType: "bar",
        period: "hour",
      })
    ).toMatchSnapshot();
  });

  it("matches snapshot for a stacked bar chart with change statistics", () => {
    expect(
      generateStatisticsChartData({
        ...baseParams,
        statisticsData: generateStatistics(3, {
          ids: sumIds,
          period: "day",
          days: 7,
          sumStatistics: true,
        }),
        statisticsMetaData: buildMetadata(sumIds, "kWh", true),
        statTypes: ["change"],
        chartType: "bar-stack",
        period: "day",
      })
    ).toMatchSnapshot();
  });

  it("matches snapshot with a hidden statistic", () => {
    expect(
      generateStatisticsChartData({
        ...baseParams,
        hiddenStats: new Set([meanIds[0]]),
        statisticsData: generateStatistics(4, {
          ids: meanIds,
          period: "hour",
          days: 1,
        }),
        statisticsMetaData: buildMetadata(meanIds),
        statTypes: ["mean", "min", "max"],
        chartType: "line",
        period: "hour",
      })
    ).toMatchSnapshot();
  });

  it("appends current state for recent data", () => {
    const id = "sensor.temp_indoor";
    const recentNow = new Date(FIXED_EPOCH_MS + dayMs + 5 * 60 * 1000);
    expect(
      generateStatisticsChartData({
        ...baseParams,
        hass: createMockHass({
          [id]: createMockEntityState(id, "21.5", {
            unit_of_measurement: "°C",
            device_class: "temperature",
          }),
        }),
        now: recentNow,
        statisticsData: generateStatistics(5, {
          ids: [id],
          period: "hour",
          days: 1,
        }),
        statisticsMetaData: buildMetadata([id]),
        statTypes: ["mean"],
        chartType: "line",
        period: "hour",
      })
    ).toMatchSnapshot();
  });

  it("infers the chart unit from metadata", () => {
    const result = generateStatisticsChartData({
      ...baseParams,
      statisticsData: generateStatistics(6, {
        ids: meanIds,
        period: "hour",
        days: 1,
      }),
      statisticsMetaData: buildMetadata(meanIds),
      statTypes: ["mean"],
      chartType: "line",
    });
    expect(result?.unit).toBe("°C");
  });

  it("large dataset digest is stable", () => {
    expect(
      digestResult(
        generateStatisticsChartData({
          ...baseParams,
          statisticsData: generateStatistics(7, {
            ids: meanIds,
            period: "5minute",
            days: 31,
          }),
          statisticsMetaData: buildMetadata(meanIds),
          statTypes: ["mean", "min", "max"],
          chartType: "line",
          period: "5minute",
        })
      )
    ).toMatchSnapshot();
  });
});
