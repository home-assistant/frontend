import { endOfToday, isSameDay } from "date-fns";
import type { LineSeriesOption } from "echarts/charts";
import type { HassEntities } from "home-assistant-js-websocket";
import { hex2rgb } from "../../../../common/color/convert-color";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { CustomLegendOption } from "../../../../components/chart/ha-chart-base";
import { computeYAxisFractionDigits } from "../../../../components/chart/y-axis-fraction-digits";
import type { EnergyData } from "../../../../data/energy";
import { getPowerFromState } from "../../../../data/energy";
import type { StatisticValue } from "../../../../data/recorder";
import { LinearGradient } from "../../../../resources/echarts/echarts";
import { fillLineGaps } from "./common/energy-chart-options";

export interface PowerSourcesGraphDataParams {
  localize: LocalizeFunc;
  states: HassEntities;
  energyData: EnergyData;
  computedStyles: CSSStyleDeclaration;
  /** Previous chart start, used for the "showing today" current-state check. */
  start: Date;
  /** Previous chart end, used for the "showing today" current-state check. */
  end: Date;
  /** Current time, injected (was `Date.now()`). */
  now: number;
}

export interface PowerSourcesGraphData {
  chartData: LineSeriesOption[];
  legendData: CustomLegendOption["data"];
  yAxisFractionDigits: number;
  start: Date;
  end: Date;
}

function processData(
  stats: StatisticValue[][],
  trackY: (v: number) => void
): { positive: [number, number][]; negative: [number, number][] } {
  const data: Record<number, number[]> = {};
  stats.forEach((statSet) => {
    statSet.forEach((point) => {
      if (point.mean == null) {
        return;
      }
      const x = (point.start + point.end) / 2;
      // Append in place instead of rebuilding the bucket array with a spread
      // on every point (which is O(n^2) for repeated timestamps). Insertion
      // order is preserved, so the later reduce() sum is bit-identical.
      (data[x] ??= []).push(point.mean);
    });
  });
  const positive: [number, number][] = [];
  const negative: [number, number][] = [];
  Object.entries(data).forEach(([x, y]) => {
    const ts = Number(x);
    // Sum the bucket with a plain left-to-right loop (initial 0) instead of
    // reduce(): most buckets hold a single mean, so reduce() is pure
    // closure/call overhead per timestamp. The IEEE-754 addition order is
    // identical, so sumY (and the downstream Math.max/Math.min) is
    // bit-identical.
    let sumY = 0;
    for (const value of y) {
      sumY += value;
    }
    const pos = Math.max(0, sumY);
    const neg = Math.min(0, sumY);
    positive.push([ts, pos]);
    negative.push([ts, neg]);
    trackY(pos);
    trackY(neg);
  });
  return { positive, negative };
}

/**
 * Transforms an energy collection update (`EnergyData` + prefs) into the
 * ECharts series, legend, and derived state for the power sources graph card.
 * Pure data processing: all environment inputs (current time, theme style,
 * localize, current entity states) are injected so the transform is
 * deterministic and benchmarkable.
 */
export function generatePowerSourcesGraphData(
  params: PowerSourcesGraphDataParams
): PowerSourcesGraphData {
  const { localize, states, energyData, computedStyles } = params;

  const datasets: LineSeriesOption[] = [];
  const legendData: CustomLegendOption["data"] = [];

  const statIds = {
    solar: {
      stats: [] as string[],
      color: "--energy-solar-color",
      name: localize("ui.panel.lovelace.cards.energy.power_graph.solar"),
    },
    grid: {
      stats: [] as string[],
      color: "--energy-grid-consumption-color",
      name: localize("ui.panel.lovelace.cards.energy.power_graph.grid"),
    },
    battery: {
      stats: [] as string[],
      color: "--energy-battery-out-color",
      name: localize("ui.panel.lovelace.cards.energy.power_graph.battery"),
    },
  };

  let yMin = Infinity;
  let yMax = -Infinity;
  const trackY = (v: number) => {
    if (v < yMin) yMin = v;
    if (v > yMax) yMax = v;
  };

  for (const source of energyData.prefs.energy_sources) {
    if (source.type === "solar") {
      if (source.stat_rate) {
        statIds.solar.stats.push(source.stat_rate);
      }
      continue;
    }

    if (source.type === "battery") {
      if (source.stat_rate) {
        statIds.battery.stats.push(source.stat_rate);
      }
      continue;
    }

    if (source.type === "grid") {
      if (source.stat_rate) {
        statIds.grid.stats.push(source.stat_rate);
      }
    }
  }
  const commonSeriesOptions: LineSeriesOption = {
    type: "line",
    smooth: 0.4,
    lineStyle: {
      width: 1,
    },
  };

  const now = params.now;
  // Whether we are showing "today" is independent of the stat id, so compute
  // it once instead of inside the per-id map below.
  const showingToday =
    isSameDay(now, params.start) && isSameDay(now, params.end);
  const seriesData: Record<
    string,
    {
      colorHex: string;
      rgb: [number, number, number];
      positive: [number, number][];
      negative: [number, number][];
    }
  > = {};

  Object.keys(statIds).forEach((key) => {
    const meta = statIds[key];
    if (meta.stats.length) {
      const colorHex = computedStyles.getPropertyValue(meta.color);
      const rgb = hex2rgb(colorHex);
      // Echarts is supposed to handle that but it is bugged when you use it together with stacking.
      // The interpolation breaks the stacking, so this positive/negative is a workaround
      const { positive, negative } = processData(
        meta.stats.map((id: string) => {
          const stats = [...(energyData.stats[id] ?? [])]
          if (showingToday) {
            // Append current state if we are showing today
            const currentStateWatts = getPowerFromState(states[id]);
            if (currentStateWatts !== undefined) {
              // getPowerFromState returns power in W; convert to kW for this graph
              stats.push({
                start: now,
                end: now,
                mean: currentStateWatts / 1000,
              });
            }
          }
          return stats;
        }),
        trackY
      );

      seriesData[key] = { colorHex, rgb, positive, negative };
    }
  });

  const pushSeries = (
    key: string,
    data: [number, number][],
    stack: "positive" | "negative",
    z: number
  ) => {
    const { colorHex, rgb } = seriesData[key];

    datasets.push({
      ...commonSeriesOptions,
      id: stack === "positive" ? key : `${key}-negative`,
      name: statIds[key].name,
      color: colorHex,
      stack,
      areaStyle: {
        color: new LinearGradient(
          0,
          stack === "positive" ? 0 : 1,
          0,
          stack === "positive" ? 1 : 0,
          [
            {
              offset: 0,
              color: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.75)`,
            },
            {
              offset: 1,
              color: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.25)`,
            },
          ]
        ),
      },
      data,
      z,
    });
  };

  // Draw in reverse order so 0 value lines are overwritten
  ["solar", "battery", "grid"].forEach((key, i) => {
    if (seriesData[key]) {
      pushSeries(key, seriesData[key].positive, "positive", 3 - i);
    }
  });

  // Draw in reverse order but above positive series
  ["battery", "grid"].forEach((key, i) => {
    if (seriesData[key]) {
      pushSeries(key, seriesData[key].negative, "negative", 4 - i);
    }
  });

  Object.keys(statIds).forEach((key) => {
    if (seriesData[key]) {
      const { colorHex, rgb } = seriesData[key];

      legendData!.push({
        id: key,
        secondaryIds: key !== "solar" ? [`${key}-negative`] : [],
        name: statIds[key].name,
        itemStyle: {
          color: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.75)`,
          borderColor: colorHex,
        },
      });
    }
  });

  const start = energyData.start;
  const end = energyData.end || endOfToday();

  const chartData = fillLineGaps(datasets);
  const yAxisFractionDigits = computeYAxisFractionDigits(yMin, yMax);

  const usageData: NonNullable<LineSeriesOption["data"]> = [];
  // fillLineGaps ensures all datasets share the same x values, so iterate the
  // P points of the first dataset and sum across the D datasets per point.
  // Use indexed for-loops and cache the per-dataset `data` arrays once
  // (instead of re-dereferencing `dataset.data![i]` up to four times and
  // allocating a closure per element) — this P x D loop is the dominant cost
  // and the savings grow with the series count. Evaluation order, the
  // typeof/`in` branch outcome, and the float-addition order are all
  // unchanged, so `usageData` is bit-identical.
  const firstData = chartData[0]?.data;
  if (firstData) {
    const numDatasets = chartData.length;
    const datasetData: NonNullable<LineSeriesOption["data"]>[] = [];
    for (let d = 0; d < numDatasets; d++) {
      datasetData.push(chartData[d].data!);
    }
    const numPoints = firstData.length;
    for (let i = 0; i < numPoints; i++) {
      const item = firstData[i];
      const x =
        typeof item === "object" && "value" in item!
          ? item.value![0]
          : item![0];
      let sum = 0;
      for (let d = 0; d < numDatasets; d++) {
        const point = datasetData[d][i];
        const y =
          typeof point === "object" && "value" in point!
            ? point.value![1]
            : point![1];
        sum += y as number;
      }
      // Consumption can't be negative; sources unaccounted for in the
      // configuration (e.g. solar exporting to grid without a configured
      // solar source) would otherwise drag the usage line below zero.
      usageData[i] = [x, Math.max(0, sum)];
    }
  }
  chartData.push({
    ...commonSeriesOptions,
    id: "usage",
    name: localize("ui.panel.lovelace.cards.energy.power_graph.usage"),
    color: computedStyles.getPropertyValue("--primary-text-color"),
    lineStyle: {
      type: [7, 2],
      width: 1.5,
    },
    data: usageData,
    z: 5,
  });
  legendData!.push({
    id: "usage",
    name: localize("ui.panel.lovelace.cards.energy.power_graph.usage"),
    itemStyle: {
      color: computedStyles.getPropertyValue("--primary-text-color"),
    },
  });

  return {
    chartData,
    legendData,
    yAxisFractionDigits,
    start,
    end,
  };
}
