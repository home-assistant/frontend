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
import { getStatisticLabel } from "../../../../data/recorder";
import { LinearGradient } from "../../../../resources/echarts/echarts";
import type { HomeAssistant } from "../../../../types";
import { getEnergyColor } from "./common/color";
import { fillLineGaps } from "./common/energy-chart-options";

type PowerSourceType = "solar" | "grid" | "battery";

export interface PowerSourcesGraphDataParams {
  localize: LocalizeFunc;
  formatPower: (powerWatts: number) => string;
  states: HassEntities;
  energyData: EnergyData;
  computedStyles: CSSStyleDeclaration;
  /** Previous chart start, used for the "showing today" current-state check. */
  start: Date;
  /** Previous chart end, used for the "showing today" current-state check. */
  end: Date;
  /** Current time, injected (was `Date.now()`). */
  now: number;
  combineSources?: boolean;
  formatEntityName?: HomeAssistant["formatEntityName"];
  darkMode?: boolean;
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

const sourceSeriesId = (type: PowerSourceType, statRate: string) =>
  `${type}-${statRate}`;

const getSplitTypes = (
  energyData: EnergyData,
  combineSources: boolean
): Set<PowerSourceType> => {
  const split = new Set<PowerSourceType>();
  if (combineSources) {
    return split;
  }
  const seen = new Set<PowerSourceType>();
  for (const source of energyData.prefs.energy_sources) {
    if (
      (source.type === "solar" ||
        source.type === "grid" ||
        source.type === "battery") &&
      source.stat_rate
    ) {
      if (seen.has(source.type)) {
        split.add(source.type);
      }
      seen.add(source.type);
    }
  }
  return split;
};

export function getPowerLegendValues(
  energyData: EnergyData,
  states: HassEntities,
  formatPower: (powerWatts: number) => string,
  combineSources = true
): Record<string, string> {
  const splitTypes = getSplitTypes(energyData, combineSources);
  const watts: Record<string, number> = {};
  let homeWatts: number | undefined;
  for (const source of energyData.prefs.energy_sources) {
    if (source.type === "home") {
      if (source.stat_rate) {
        const w = getPowerFromState(states[source.stat_rate]);
        if (w !== undefined) {
          homeWatts = (homeWatts ?? 0) + w;
        }
      }
      continue;
    }
    if (
      (source.type === "solar" ||
        source.type === "grid" ||
        source.type === "battery") &&
      source.stat_rate
    ) {
      const w = getPowerFromState(states[source.stat_rate]);
      if (w !== undefined) {
        const key = splitTypes.has(source.type)
          ? sourceSeriesId(source.type, source.stat_rate)
          : source.type;
        watts[key] = (watts[key] ?? 0) + w;
      }
    }
  }
  const keys = Object.keys(watts);
  if (!keys.length && homeWatts === undefined) {
    return {};
  }
  const values: Record<string, string> = {};
  let total = 0;
  for (const key of keys) {
    values[key] = formatPower(watts[key]);
    total += watts[key];
  }
  values.usage = formatPower(Math.max(0, homeWatts ?? total));
  return values;
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
  const combineSources = params.combineSources ?? true;
  const splitTypes = getSplitTypes(energyData, combineSources);

  const legendValues = getPowerLegendValues(
    energyData,
    states,
    params.formatPower,
    combineSources
  );

  const datasets: LineSeriesOption[] = [];
  const legendData: CustomLegendOption["data"] = [];

  const typeMeta: Record<PowerSourceType, { color: string; name: string }> = {
    solar: {
      color: "--energy-solar-color",
      name: localize("ui.panel.lovelace.cards.energy.power_graph.solar"),
    },
    grid: {
      color: "--energy-grid-consumption-color",
      name: localize("ui.panel.lovelace.cards.energy.power_graph.grid"),
    },
    battery: {
      color: "--energy-battery-out-color",
      name: localize("ui.panel.lovelace.cards.energy.power_graph.battery"),
    },
  };

  interface SeriesGroup {
    id: string;
    type: PowerSourceType;
    stats: string[];
    name: string;
    positiveName: string;
    negativeName: string;
    colorHex: string;
  }
  const groups: Record<PowerSourceType, SeriesGroup[]> = {
    solar: [],
    grid: [],
    battery: [],
  };

  let yMin = Infinity;
  let yMax = -Infinity;
  const trackY = (v: number) => {
    if (v < yMin) yMin = v;
    if (v > yMax) yMax = v;
  };
  let homeStatId: string | undefined;
  const typeIdx: Record<PowerSourceType, number> = {
    solar: 0,
    grid: 0,
    battery: 0,
  };

  for (const source of energyData.prefs.energy_sources) {
    if (source.type === "home") {
      homeStatId = source.stat_rate;
      continue;
    }
    if (
      source.type !== "solar" &&
      source.type !== "grid" &&
      source.type !== "battery"
    ) {
      continue;
    }
    const idx = typeIdx[source.type]++;
    if (!source.stat_rate) {
      continue;
    }
    if (!splitTypes.has(source.type)) {
      const meta = typeMeta[source.type];
      if (!groups[source.type].length) {
        groups[source.type].push({
          id: source.type,
          type: source.type,
          stats: [],
          name: meta.name,
          positiveName: meta.name,
          negativeName: meta.name,
          colorHex: computedStyles.getPropertyValue(meta.color),
        });
      }
      groups[source.type][0].stats.push(source.stat_rate);
      continue;
    }
    const name =
      source.name ||
      (params.formatEntityName
        ? getStatisticLabel(
            states,
            params.formatEntityName,
            source.stat_rate,
            energyData.statsMetadata[source.stat_rate]
          )
        : source.stat_rate);
    let positiveName = name;
    let negativeName = name;
    if (source.name && source.type === "battery") {
      positiveName = localize(
        "ui.panel.lovelace.cards.energy.energy_sources_table.named_battery_discharged",
        { name: source.name }
      );
      negativeName = localize(
        "ui.panel.lovelace.cards.energy.energy_sources_table.named_battery_charged",
        { name: source.name }
      );
    } else if (
      source.name &&
      source.type === "grid" &&
      source.stat_energy_from &&
      source.stat_energy_to
    ) {
      positiveName = localize(
        "ui.panel.lovelace.cards.energy.energy_sources_table.named_grid_imported",
        { name: source.name }
      );
      negativeName = localize(
        "ui.panel.lovelace.cards.energy.energy_sources_table.named_grid_exported",
        { name: source.name }
      );
    }
    groups[source.type].push({
      id: sourceSeriesId(source.type, source.stat_rate),
      type: source.type,
      stats: [source.stat_rate],
      name,
      positiveName,
      negativeName,
      colorHex: getEnergyColor(
        computedStyles,
        params.darkMode ?? false,
        false,
        false,
        typeMeta[source.type].color,
        idx
      ),
    });
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
      rgb: [number, number, number];
      positive: [number, number][];
      negative: [number, number][];
    }
  > = {};
  const statsById = energyData.stats;

  const getStatsWithCurrent = (id: string): StatisticValue[] => {
    const stats = [...(statsById[id] ?? [])];
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
  };

  const legendOrder: PowerSourceType[] = ["solar", "grid", "battery"];
  legendOrder.forEach((type) => {
    groups[type].forEach((group) => {
      const rgb = hex2rgb(group.colorHex);
      // Echarts is supposed to handle that but it is bugged when you use it together with stacking.
      // The interpolation breaks the stacking, so this positive/negative is a workaround
      const { positive, negative } = processData(
        group.stats.map(getStatsWithCurrent),
        trackY
      );

      seriesData[group.id] = { rgb, positive, negative };
    });
  });

  const pushSeries = (
    group: SeriesGroup,
    data: [number, number][],
    stack: "positive" | "negative",
    z: number
  ) => {
    const { rgb } = seriesData[group.id];

    datasets.push({
      ...commonSeriesOptions,
      id: stack === "positive" ? group.id : `${group.id}-negative`,
      name: stack === "positive" ? group.positiveName : group.negativeName,
      color: group.colorHex,
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
  (["solar", "battery", "grid"] as const).forEach((type, i) => {
    groups[type].forEach((group) => {
      pushSeries(group, seriesData[group.id].positive, "positive", 3 - i);
    });
  });

  // Draw in reverse order but above positive series
  (["battery", "grid"] as const).forEach((type, i) => {
    groups[type].forEach((group) => {
      pushSeries(group, seriesData[group.id].negative, "negative", 4 - i);
    });
  });

  legendOrder.forEach((type) => {
    groups[type].forEach((group) => {
      const { rgb } = seriesData[group.id];

      legendData!.push({
        id: group.id,
        secondaryIds: type !== "solar" ? [`${group.id}-negative`] : [],
        name: group.name,
        value: legendValues[group.id],
        itemStyle: {
          color: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.75)`,
          borderColor: group.colorHex,
        },
      });
    });
  });

  const start = energyData.start;
  const end = energyData.end || endOfToday();

  const chartData = fillLineGaps(datasets);

  const homeStats = homeStatId
    ? getStatsWithCurrent(homeStatId).filter((stat) => stat.mean != null)
    : [];
  homeStats.forEach((stat) => trackY(stat.mean!));
  let homeIdx = 0;
  // Home reading covering timestamp x (its bucket, or the live point)
  const homeAt = (x: number): number | undefined => {
    while (
      homeIdx < homeStats.length - 1 &&
      homeStats[homeIdx + 1].start <= x
    ) {
      homeIdx++;
    }
    const stat = homeStats[homeIdx];
    return stat && stat.start <= x && x <= stat.end ? stat.mean! : undefined;
  };

  const yAxisFractionDigits = computeYAxisFractionDigits(yMin, yMax, true);

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
      usageData[i] = [x, Math.max(0, homeAt(x) ?? sum)];
    }
  } else {
    for (const stat of homeStats) {
      usageData.push([(stat.start + stat.end) / 2, Math.max(0, stat.mean!)]);
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
    value: legendValues.usage,
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
