import type { BarSeriesOption } from "echarts/charts";
import { getGraphColorByIndex } from "../../../../common/color/colors";
import { computeYAxisFractionDigits } from "../../../../components/chart/y-axis-fraction-digits";
import type { CustomLegendOption } from "../../../../components/chart/ha-chart-base";
import type {
  DeviceConsumptionEnergyPreference,
  EnergyData,
} from "../../../../data/energy";
import {
  computeConsumptionData,
  getSuggestedPeriod,
  getSummedData,
} from "../../../../data/energy";
import type { Statistics, StatisticsMetaData } from "../../../../data/recorder";
import {
  calculateStatisticSumGrowth,
  getStatisticLabel,
  isExternalStatistic,
} from "../../../../data/recorder";
import type { HomeAssistant } from "../../../../types";
import type { EnergyDevicesDetailGraphCardConfig } from "../types";
import {
  computeStatMidpoint,
  type EnergyDataPoint,
  fillDataGapsAndRoundCaps,
  getCompareTransform,
} from "./common/energy-chart-options";
import { getEnergyColor } from "./common/color";

const UNIT = "kWh";

export interface EnergyDevicesDetailGraphDataParams {
  hass: HomeAssistant;
  energyData: EnergyData;
  config: EnergyDevicesDetailGraphCardConfig;
  computedStyles: CSSStyleDeclaration;
  now: Date;
  /**
   * Numeric suffix appended to the untracked dataset's series id so it always
   * sorts after the device datasets. The original card sourced this from a
   * fresh `Date.now()` read (distinct from `now`, which is `endOfToday()`);
   * it is injected here to keep the transform pure and deterministic.
   */
  untrackedOrder: number;
}

export interface EnergyDevicesDetailGraphData {
  chartData: BarSeriesOption[];
  yAxisFractionDigits: number;
  legendData: CustomLegendOption["data"];
  start: Date;
  end: Date;
  compareStart?: Date;
  compareEnd?: Date;
}

const getStatIdFromId = (id: string): string =>
  id
    .replace(/^compare-/, "") // Remove compare- prefix
    .replace(/-\d+$/, ""); // Remove numeric suffix

interface ProcessContext {
  hass: HomeAssistant;
  config: EnergyDevicesDetailGraphCardConfig;
  start: Date;
  end: Date;
  compareStart?: Date;
  untrackedOrder: number;
}

function processDataSet(
  ctx: ProcessContext,
  computedStyle: CSSStyleDeclaration,
  statistics: Statistics,
  statisticsMetaData: Record<string, StatisticsMetaData>,
  devices: DeviceConsumptionEnergyPreference[],
  sorted_devices: string[],
  childMap: Record<string, string[]>,
  trackY: (v: number) => void,
  compare = false
) {
  const data: BarSeriesOption[] = [];
  const compareTransform = getCompareTransform(ctx.start, ctx.compareStart!);
  const period = getSuggestedPeriod(ctx.start, ctx.end);

  // Lazily memoize a start -> change lookup per child stat so the per-point
  // child summation is O(1) instead of a linear `.find` scan. Mirrors the
  // original `cStats.find((s) => s.start === start)?.change` first-match
  // semantics (only the first entry for a given start is kept).
  const childStartChange = new Map<
    string,
    Map<number, number | null | undefined>
  >();
  const getChildStartChange = (
    childId: string
  ): Map<number, number | null | undefined> => {
    let byStart = childStartChange.get(childId);
    if (byStart === undefined) {
      byStart = new Map<number, number | null | undefined>();
      const cStats = statistics[childId];
      if (cStats) {
        for (const cStat of cStats) {
          if (!byStart.has(cStat.start)) {
            byStart.set(cStat.start, cStat.change);
          }
        }
      }
      childStartChange.set(childId, byStart);
    }
    return byStart;
  };

  devices.forEach((source, idx) => {
    const order = sorted_devices.indexOf(source.stat_consumption);
    if (ctx.config.max_devices && order >= ctx.config.max_devices) {
      // eslint-disable-next-line no-console
      console.warn(
        `Max devices exceeded for ${source.name} (${order} >= ${ctx.config.max_devices})`
      );
      return;
    }
    const color = getGraphColorByIndex(idx, computedStyle);

    let prevStart: number | null = null;

    const consumptionData: BarSeriesOption["data"] = [];

    // Process device consumption data.
    if (source.stat_consumption in statistics) {
      const stats = statistics[source.stat_consumption];
      const children = childMap[source.stat_consumption] || [];

      for (const point of stats) {
        if (
          point.change === null ||
          point.change === undefined ||
          point.change === 0
        ) {
          continue;
        }
        if (prevStart === point.start) {
          continue;
        }
        let sumChildren = 0;
        children.forEach((c) => {
          sumChildren += getChildStartChange(c).get(point.start) || 0;
        });

        const y = point.change - sumChildren;
        const dataPoint: EnergyDataPoint = [
          computeStatMidpoint(
            point.start,
            point.end,
            period,
            compare ? compareTransform : undefined
          ),
          y,
          point.start,
        ];
        consumptionData.push(dataPoint);
        trackY(y);
        prevStart = point.start;
      }
    }

    const name =
      (source.name ||
        getStatisticLabel(
          ctx.hass,
          source.stat_consumption,
          statisticsMetaData[source.stat_consumption]
        )) +
      (source.stat_consumption in childMap
        ? ` (${ctx.hass.localize("ui.panel.lovelace.cards.energy.energy_devices_detail_graph.untracked")})`
        : "");

    data.push({
      type: "bar",
      cursor: "default",
      // add order to id, otherwise echarts refuses to reorder them
      id: compare
        ? `compare-${source.stat_consumption}-${order}`
        : `${source.stat_consumption}-${order}`,
      name,
      itemStyle: {
        borderColor: compare ? color + "7F" : color,
      },
      barMaxWidth: 50,
      color: compare ? color + "32" : color + "7F",
      data: consumptionData,
      stack: compare ? "devicesCompare" : "devices",
    });
  });
  // Index built series by their stat id (first match wins, matching the
  // original `data.find`) so the reorder is a single map lookup per device
  // instead of an O(devices^2) scan with a regex per comparison.
  const byStatId = new Map<string, BarSeriesOption>();
  for (const d of data) {
    const statId = getStatIdFromId(d.id as string);
    if (!byStatId.has(statId)) {
      byStatId.set(statId, d);
    }
  }
  return sorted_devices.map((device) => byStatId.get(device)!).filter(Boolean);
}

function processUntracked(
  ctx: ProcessContext,
  computedStyle: CSSStyleDeclaration,
  processedData,
  consumptionData,
  trackY: (v: number) => void,
  compare: boolean
): BarSeriesOption {
  const totalDeviceConsumption: Record<number, number> = {};

  processedData.forEach((device) => {
    device.data.forEach((datapoint) => {
      totalDeviceConsumption[datapoint[2]] =
        (totalDeviceConsumption[datapoint[2]] || 0) + datapoint[1];
    });
  });
  const compareTransform = getCompareTransform(ctx.start, ctx.compareStart!);
  const period = getSuggestedPeriod(ctx.start, ctx.end);

  const untrackedConsumption: BarSeriesOption["data"] = [];
  const sortedTimes = Object.keys(consumptionData.used_total).sort(
    (a, b) => Number(a) - Number(b)
  );
  // Only start timestamps available here, so estimate midpoint from the gap
  // between the first two entries. Assumes uniform period spacing.
  const periodOffset =
    (period === "hour" || period === "5minute") && sortedTimes.length >= 2
      ? (Number(sortedTimes[1]) - Number(sortedTimes[0])) / 2
      : 0;
  sortedTimes.forEach((time) => {
    const ts = Number(time);
    const value =
      consumptionData.used_total[time] - (totalDeviceConsumption[time] || 0);
    const dataPoint: EnergyDataPoint = [ts + periodOffset, value, ts];
    if (compare) {
      dataPoint[0] = compareTransform(new Date(ts)).getTime() + periodOffset;
    }
    untrackedConsumption.push(dataPoint);
    trackY(value);
  });
  // random id to always add untracked at the end
  const order = ctx.untrackedOrder;
  const dataset: BarSeriesOption = {
    type: "bar",
    cursor: "default",
    id: compare ? `compare-untracked-${order}` : `untracked-${order}`,
    name: ctx.hass.localize(
      "ui.panel.lovelace.cards.energy.energy_devices_detail_graph.untracked_consumption"
    ),
    itemStyle: {
      borderColor: getEnergyColor(
        computedStyle,
        ctx.hass.themes.darkMode,
        false,
        compare,
        "--history-unknown-color"
      ),
    },
    barMaxWidth: 50,
    color: getEnergyColor(
      computedStyle,
      ctx.hass.themes.darkMode,
      true,
      compare,
      "--history-unknown-color"
    ),
    data: untrackedConsumption,
    stack: compare ? "devicesCompare" : "devices",
  };
  return dataset;
}

/**
 * Transforms an `EnergyData` collection update into the ECharts bar series and
 * derived chart state for `hui-energy-devices-detail-graph-card`. Pure data
 * processing: all environment inputs (current time via `now`, theme style via
 * `computedStyles`, hass, config) are injected so the transform is
 * deterministic and benchmarkable.
 */
export function generateEnergyDevicesDetailGraphData(
  params: EnergyDevicesDetailGraphDataParams
): EnergyDevicesDetailGraphData {
  const { hass, energyData, config, computedStyles, now, untrackedOrder } =
    params;

  const start = energyData.start;
  const end = energyData.end || now;

  const compareStart = energyData.startCompare;
  const compareEnd = energyData.endCompare;

  const data = energyData.stats;
  const compareData = energyData.statsCompare;

  const ctx: ProcessContext = {
    hass,
    config,
    start,
    end,
    compareStart,
    untrackedOrder,
  };

  const devices = energyData.prefs.device_consumption;

  const childMap: Record<string, string[]> = {};
  devices.forEach((d) => {
    if (d.included_in_stat) {
      childMap[d.included_in_stat] = childMap[d.included_in_stat] || [];
      childMap[d.included_in_stat].push(d.stat_consumption);
    }
  });

  const growthValues = {};
  energyData.prefs.device_consumption.forEach((device) => {
    const value =
      device.stat_consumption in data
        ? calculateStatisticSumGrowth(data[device.stat_consumption]) || 0
        : 0;

    growthValues[device.stat_consumption] = value;
  });
  const growthValuesExChildren = {};
  energyData.prefs.device_consumption.forEach((device) => {
    growthValuesExChildren[device.stat_consumption] = (
      childMap[device.stat_consumption] || []
    ).reduce(
      (acc, child) => acc - growthValues[child],
      growthValues[device.stat_consumption]
    );
  });

  const sorted_devices = energyData.prefs.device_consumption.map(
    (device) => device.stat_consumption
  );
  sorted_devices.sort(
    (a, b) => growthValuesExChildren[b] - growthValuesExChildren[a]
  );

  const datasets: BarSeriesOption[] = [];

  let yMin = Infinity;
  let yMax = -Infinity;
  const trackY = (v: number) => {
    if (v < yMin) yMin = v;
    if (v > yMax) yMax = v;
  };

  const { summedData, compareSummedData } = getSummedData(energyData);

  const showUntracked =
    "from_grid" in summedData ||
    "solar" in summedData ||
    "from_battery" in summedData;

  const {
    consumption: consumptionData,
    compareConsumption: consumptionCompareData,
  } = showUntracked
    ? computeConsumptionData(summedData, compareSummedData)
    : { consumption: undefined, compareConsumption: undefined };

  if (compareData) {
    const processedCompareData = processDataSet(
      ctx,
      computedStyles,
      compareData,
      energyData.statsMetadata,
      energyData.prefs.device_consumption,
      sorted_devices,
      childMap,
      trackY,
      true
    );

    datasets.push(...processedCompareData);

    if (showUntracked) {
      const untrackedCompareData = processUntracked(
        ctx,
        computedStyles,
        processedCompareData,
        consumptionCompareData,
        trackY,
        true
      );
      datasets.push(untrackedCompareData);
    }
  }

  // add empty dataset so compare bars are first
  // `stack: devices` so it doesn't take up space yet
  datasets.push({
    id: "compare-placeholder",
    type: "bar",
    stack: energyData.statsCompare ? "devicesCompare" : "devices",
    data: [],
  });

  const processedData = processDataSet(
    ctx,
    computedStyles,
    data,
    energyData.statsMetadata,
    energyData.prefs.device_consumption,
    sorted_devices,
    childMap,
    trackY
  );

  datasets.push(...processedData);
  const legendData: CustomLegendOption["data"] = processedData.map((d) => {
    const statId = getStatIdFromId(d.id as string);
    return {
      id: d.id as string,
      secondaryIds: [`compare-${d.id}`],
      name: d.name as string,
      itemStyle: {
        color: d.color as string,
        borderColor: d.itemStyle?.borderColor as string,
      },
      noLabelClick: isExternalStatistic(statId) || !hass.states[statId],
    };
  });

  if (showUntracked) {
    const untrackedData = processUntracked(
      ctx,
      computedStyles,
      processedData,
      consumptionData,
      trackY,
      false
    );
    datasets.push(untrackedData);
    legendData.push({
      id: untrackedData.id as string,
      secondaryIds: [`compare-${untrackedData.id}`],
      name: untrackedData.name as string,
      itemStyle: {
        color: untrackedData.color as string,
        borderColor: untrackedData.itemStyle?.borderColor as string,
      },
      noLabelClick: true,
    });
  }

  fillDataGapsAndRoundCaps(datasets);
  const yAxisFractionDigits = computeYAxisFractionDigits(yMin, yMax);

  return {
    chartData: datasets,
    yAxisFractionDigits,
    legendData,
    start,
    end,
    compareStart,
    compareEnd,
  };
}

export { getStatIdFromId, UNIT };
