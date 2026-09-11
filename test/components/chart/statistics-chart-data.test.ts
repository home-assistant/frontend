/**
 * Characterization tests pinning the exact output of the statistics chart
 * data transform. Do NOT update these snapshots to make an optimization
 * pass — see test/benchmarks/README.md.
 */
import { describe, expect, it } from "vitest";
import { generateStatisticsChartData } from "../../../src/components/chart/statistics-chart-data";
import {
  downSampleLineData,
  downSampleAlignedLineData,
} from "../../../src/components/chart/down-sample";
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

  it("aligns stacked lines by timestamp when one statistic has a gap", () => {
    const ids = ["sensor.charger", "sensor.pv"];
    const start = FIXED_EPOCH_MS;
    const period = 5 * 60 * 1000;
    const statistics = {
      [ids[0]]: [
        { start, end: start + period, mean: 10 },
        { start: start + 2 * period, end: start + 3 * period, mean: 20 },
      ],
      [ids[1]]: [
        { start, end: start + period, mean: 100 },
        { start: start + period, end: start + 2 * period, mean: 110 },
        { start: start + 2 * period, end: start + 3 * period, mean: 120 },
      ],
    };

    const result = generateStatisticsChartData({
      ...baseParams,
      statisticsData: statistics,
      statisticsMetaData: buildMetadata(ids),
      statTypes: ["mean"],
      chartType: "line-stack",
      period: "5minute",
    });
    const series = result!.datasets.filter((dataset) => dataset.data?.length);
    expect(series).toHaveLength(2);
    expect(series[0].data).toEqual([
      [start, 10],
      [start + period, 10],
      [start + period, null],
      [start + 2 * period, 20],
      [start + 2 * period, 20],
    ]);
    expect(series[1].data).toEqual([
      [start, 100],
      [start + period, 110],
      [start + period, 110],
      [start + 2 * period, 120],
      [start + 2 * period, 120],
    ]);
  });

  it("keeps every stacked statistic type in its gap slot", () => {
    const ids = ["sensor.charger", "sensor.pv"];
    const start = FIXED_EPOCH_MS;
    const period = 5 * 60 * 1000;
    const statistics = {
      [ids[0]]: [
        { start, end: start + period, mean: 10, min: 1, max: 11 },
        {
          start: start + 2 * period,
          end: start + 3 * period,
          mean: 20,
          min: 2,
          max: 22,
        },
      ],
      [ids[1]]: [
        { start, end: start + period, mean: 100, min: 90, max: 110 },
        {
          start: start + period,
          end: start + 2 * period,
          mean: 101,
          min: 91,
          max: 111,
        },
        {
          start: start + 2 * period,
          end: start + 3 * period,
          mean: 102,
          min: 92,
          max: 112,
        },
      ],
    };

    const result = generateStatisticsChartData({
      ...baseParams,
      statisticsData: statistics,
      statisticsMetaData: buildMetadata(ids),
      statTypes: ["mean", "min", "max"],
      chartType: "line-stack",
      period: "5minute",
    })!;
    const series = result.datasets.filter((dataset) => dataset.data?.length);

    expect(series.map((dataset) => dataset.data)).toEqual([
      [
        [start, 10],
        [start + period, 10],
        [start + period, null],
        [start + 2 * period, 20],
        [start + 2 * period, 20],
      ],
      [
        [start, 1],
        [start + period, 1],
        [start + period, null],
        [start + 2 * period, 2],
        [start + 2 * period, 2],
      ],
      [
        [start, 11],
        [start + period, 11],
        [start + period, null],
        [start + 2 * period, 22],
        [start + 2 * period, 22],
      ],
      [
        [start, 100],
        [start + period, 101],
        [start + period, 101],
        [start + 2 * period, 102],
        [start + 2 * period, 102],
      ],
      [
        [start, 90],
        [start + period, 91],
        [start + period, 91],
        [start + 2 * period, 92],
        [start + 2 * period, 92],
      ],
      [
        [start, 110],
        [start + period, 111],
        [start + period, 111],
        [start + 2 * period, 112],
        [start + 2 * period, 112],
      ],
    ]);
  });

  it("keeps plain lines independently sampled", () => {
    const ids = ["sensor.charger", "sensor.pv"];
    const start = FIXED_EPOCH_MS;
    const period = 5 * 60 * 1000;
    const statistics = {
      [ids[0]]: [
        { start, end: start + period, mean: 10 },
        { start: start + 2 * period, end: start + 3 * period, mean: 20 },
      ],
      [ids[1]]: [
        { start, end: start + period, mean: 100 },
        { start: start + period, end: start + 2 * period, mean: 110 },
        { start: start + 2 * period, end: start + 3 * period, mean: 120 },
      ],
    };
    const result = generateStatisticsChartData({
      ...baseParams,
      statisticsData: statistics,
      statisticsMetaData: buildMetadata(ids),
      statTypes: ["mean"],
      chartType: "line",
      period: "5minute",
    });
    const series = result!.datasets.filter((dataset) => dataset.data?.length);
    expect(series[0].data!.length).not.toBe(series[1].data!.length);
    expect(series[0].sampling).toBe("minmax");
  });

  it("keeps dense stacked timestamps aligned through the chart render decision", () => {
    const ids = ["sensor.charger", "sensor.pv"];
    const start = FIXED_EPOCH_MS;
    const period = 5 * 60 * 1000;
    const count = 600;
    const makeSeries = (skipGap: boolean) =>
      Array.from({ length: count }, (_, index) => index)
        .filter((index) => !skipGap || index < 210 || index > 390)
        .map((index) => ({
          start: start + index * period,
          end: start + (index + 1) * period,
          mean:
            index === 90 ? 1000 : index === 450 ? 0 : 50 + ((index * 37) % 101),
        }));
    const statistics = {
      [ids[0]]: makeSeries(true),
      [ids[1]]: makeSeries(false),
    };
    const params: Parameters<typeof generateStatisticsChartData>[0] = {
      ...baseParams,
      statisticsData: statistics,
      statisticsMetaData: buildMetadata(ids),
      statTypes: ["mean"],
      chartType: "line-stack" as const,
      period: "5minute",
      endTime: new Date(start + (count - 1) * period),
    };

    const result = generateStatisticsChartData(params)!;
    const stackedSeries = result.datasets.filter(
      (dataset) => dataset.data?.length
    );
    expect(stackedSeries).toHaveLength(2);
    expect(
      stackedSeries.every((dataset) => dataset.sampling === "minmax")
    ).toBe(true);
    const independentlySampled = stackedSeries.map((dataset) =>
      downSampleLineData(dataset.data as [number, number | null][], 40).map(
        ([timestamp]) => timestamp
      )
    );
    expect(independentlySampled[0]).not.toEqual(independentlySampled[1]);
    const sampled = downSampleAlignedLineData(
      stackedSeries.map((dataset) => dataset.data as [number, number | null][]),
      40
    );
    expect(sampled[0].length).toBeLessThan(300);
    const renderedTimestamps = sampled.map((data) =>
      data.map((point) => (point as [number, number | null])[0])
    );
    expect(renderedTimestamps[0]).toEqual(renderedTimestamps[1]);
  });

  it("excludes hidden and clipped statistics from the stacked timeline", () => {
    const ids = [
      "sensor.charger",
      "sensor.pv",
      "sensor.hidden",
      "sensor.future",
    ];
    const start = FIXED_EPOCH_MS;
    const period = 5 * 60 * 1000;
    const result = generateStatisticsChartData({
      ...baseParams,
      statisticsData: {
        [ids[0]]: [
          { start, end: start + period, mean: 10 },
          { start: start + period, end: start + 2 * period, mean: 20 },
        ],
        [ids[1]]: [
          { start, end: start + period, mean: 100 },
          { start: start + period, end: start + 2 * period, mean: 200 },
        ],
        [ids[2]]: [
          { start: start + period / 2, end: start + period, mean: 50 },
        ],
        [ids[3]]: [
          { start: start + 2 * period, end: start + 3 * period, mean: 75 },
        ],
      },
      statisticsMetaData: buildMetadata(ids),
      statTypes: ["mean"],
      chartType: "line-stack",
      period: "5minute",
      endTime: new Date(start + period),
      hiddenStats: new Set([ids[2]]),
    })!;
    const series = result.datasets.filter((dataset) => dataset.data?.length);

    expect(series).toHaveLength(2);
    expect(series.map((dataset) => dataset.data)).toEqual([
      [
        [start, 10],
        [start + period, 20],
        [start + period, 20],
      ],
      [
        [start, 100],
        [start + period, 200],
        [start + period, 200],
      ],
    ]);
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
