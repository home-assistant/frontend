import type {
  BarSeriesOption,
  LineSeriesOption,
  ZRColor,
} from "echarts/types/dist/shared";
import { getGraphColorByIndex } from "../../common/color/colors";
import type {
  Statistics,
  StatisticsMetaData,
  StatisticType,
} from "../../data/recorder";
import {
  getDisplayUnit,
  getStatisticLabel,
  isExternalStatistic,
  statisticsHaveType,
} from "../../data/recorder";
import type { HomeAssistant } from "../../types";
import { fillDataGapsAndRoundCaps } from "./round-caps";
import { computeYAxisFractionDigits } from "./y-axis-fraction-digits";

export interface StatisticsChartLegendItem {
  id: string;
  name: string;
  color?: ZRColor;
  borderColor?: ZRColor;
  noLabelClick?: boolean;
}

export interface StatisticsChartDataParams {
  hass: HomeAssistant;
  statisticsData: Statistics;
  statisticsMetaData: Record<string, StatisticsMetaData>;
  names?: Record<string, string>;
  colors?: Record<string, string | undefined>;
  unit?: string;
  endTime?: Date;
  statTypes: StatisticType[];
  chartType: "line" | "line-stack" | "bar" | "bar-stack";
  period?: string;
  hideLegend: boolean;
  hiddenStats: ReadonlySet<string>;
  computedStyle: CSSStyleDeclaration;
  now: Date;
}

export interface StatisticsChartData {
  datasets: (LineSeriesOption | BarSeriesOption)[];
  legendData: StatisticsChartLegendItem[];
  statisticIds: string[];
  /** Chart unit, inferred from statistics metadata when not set explicitly */
  unit?: string;
  yAxisFractionDigits: number;
}

/**
 * Transforms raw statistics into ECharts series for `statistics-chart`.
 * Pure data processing: all environment inputs (current time, theme style,
 * hass) are injected so the transform is deterministic and benchmarkable.
 */
export function generateStatisticsChartData(
  params: StatisticsChartDataParams
): StatisticsChartData | undefined {
  const { hass, statisticsMetaData, computedStyle, now, hiddenStats } = params;

  let colorIndex = 0;
  const chartType = params.chartType.startsWith("line") ? "line" : "bar";
  const chartStacked = params.chartType.endsWith("stack");
  const statisticsData = Object.entries(params.statisticsData);
  const totalDataSets: (LineSeriesOption | BarSeriesOption)[] = [];
  let yMin = Infinity;
  let yMax = -Infinity;
  const trackY = (v: number | null | undefined) => {
    if (typeof v === "number" && Number.isFinite(v)) {
      if (v < yMin) yMin = v;
      if (v > yMax) yMax = v;
    }
  };
  const legendData: StatisticsChartLegendItem[] = [];
  const statisticIds: string[] = [];
  let endTime: Date;

  if (statisticsData.length === 0) {
    return undefined;
  }

  endTime =
    params.endTime ||
    // Get the highest date from the last date of each statistic
    new Date(
      Math.max(
        ...statisticsData.map(([_, stats]) =>
          new Date(stats[stats.length - 1].start).getTime()
        )
      )
    );

  if (endTime > now) {
    endTime = now;
  }

  // Check if we need to display most recent data. Allow 10m of leeway for "now",
  // because stats are 5 minute aggregated.
  // Use same now point for all statistics even if processing time means the
  // state value is actually from a slightly later time. Otherwise the points
  // end up separated slightly and disappear from the tooltips.
  const displayCurrentState = now.getTime() - endTime.getTime() <= 600000;

  // Try to determine chart unit if it has not already been set explicitly
  let unit = params.unit;
  if (!unit) {
    let inferredUnit: string | undefined | null;
    statisticsData.forEach(([statistic_id, _stats]) => {
      const meta = statisticsMetaData?.[statistic_id];
      const statisticUnit = getDisplayUnit(hass, statistic_id, meta);
      if (inferredUnit === undefined) {
        inferredUnit = statisticUnit;
      } else if (inferredUnit !== null && inferredUnit !== statisticUnit) {
        // Clear unit if not all statistics have same unit
        inferredUnit = null;
      }
    });
    if (inferredUnit) {
      unit = inferredUnit;
    }
  }

  const names = params.names || {};
  const colors = params.colors || {};
  statisticsData.forEach(([statistic_id, stats]) => {
    const meta = statisticsMetaData?.[statistic_id];
    let name = names[statistic_id];
    if (name === undefined) {
      name = getStatisticLabel(hass, statistic_id, meta);
    }

    // array containing [value1, value2, etc]
    let prevValues: (number | null)[][] | null = null;
    let prevEndTime: Date | undefined;

    // The datasets for the current statistic
    const statDataSets: (LineSeriesOption | BarSeriesOption)[] = [];
    const statLegendData: StatisticsChartLegendItem[] = [];

    // Place bars at centre of their specified time range if this is a bar chart
    // and the period is 5minute or hour.
    const centerBars =
      chartType === "bar" &&
      (params.period === "5minute" || params.period === "hour");

    const pushData = (
      start: Date, // Data point start time
      end: Date, // Data point end time
      limit: Date, // Limit for end time (e.g. now)
      dataValues: (number | null)[][]
    ) => {
      if (!dataValues.length) return;
      // Limit for time range is lesser of overall limit and data point end
      limit = end.getTime() < limit.getTime() ? end : limit;
      if (start.getTime() > limit.getTime()) {
        // Drop data points that are after the requested endTime. This could happen if
        // endTime is "now" and client time is not in sync with server time.
        return;
      }
      statDataSets.forEach((d, i) => {
        if (chartType === "line") {
          if (
            prevEndTime &&
            prevValues &&
            prevEndTime.getTime() !== start.getTime()
          ) {
            // if the end of the previous data doesn't match the start of the current data,
            // we have to draw a gap so add a value at the end time, and then an empty value.
            d.data!.push([prevEndTime, ...prevValues[i]!]);
            d.data!.push([prevEndTime, null]);
          }
          d.data!.push([start, ...dataValues[i]!]);
          // For band-top rows dataValues[i] is [diff, top]; the actual Y is
          // the last element. For regular rows it's [value]. Same call works.
          trackY(dataValues[i][dataValues[i].length - 1]);
        } else {
          let time = start;
          if (centerBars) {
            // If centering bars, set the time to the midpoint between start and end instead
            // of the start time.
            time = new Date((start.getTime() + end.getTime()) / 2);
          }
          // Data value should always be a scalar for bar charts. Pass in
          // real start time as extra value to allow formatting tooltip.
          d.data!.push([time, dataValues[i][0]!, start, end]);
          trackY(dataValues[i][0]);
        }
      });
      prevValues = dataValues;
      prevEndTime = limit;
    };

    let color = colors[statistic_id];
    if (color === undefined) {
      color = getGraphColorByIndex(colorIndex, computedStyle);
      colorIndex++;
    }

    const statTypes: StatisticType[] = [];

    const hasMean =
      params.statTypes.includes("mean") && statisticsHaveType(stats, "mean");
    const hasMax =
      params.statTypes.includes("max") && statisticsHaveType(stats, "max");
    const hasMin =
      params.statTypes.includes("min") && statisticsHaveType(stats, "min");
    const drawBands =
      !chartStacked && [hasMean, hasMax, hasMin].filter(Boolean).length > 1;

    const hasState = params.statTypes.includes("state");

    const bandTop = hasMax ? "max" : "mean";
    const bandBottom = hasMin ? "min" : "mean";

    const sortedTypes = drawBands
      ? [...params.statTypes].sort((a, b) => {
          if (a === "min" || b === "max") {
            return -1;
          }
          if (a === "max" || b === "min") {
            return +1;
          }
          return 0;
        })
      : params.statTypes;

    let displayedLegend = false;
    sortedTypes.forEach((type) => {
      if (statisticsHaveType(stats, type)) {
        const band = drawBands && (type === bandTop || type === bandBottom);
        statTypes.push(type);
        const borderColor =
          (band && hasMin && hasMax && hasMean) ||
          (hasState && ["change", "sum"].includes(type))
            ? color + (params.hideLegend ? "00" : "7F")
            : color;
        const backgroundColor = band ? color + "3F" : color + "7F";
        const series: LineSeriesOption | BarSeriesOption = {
          id: `${statistic_id}-${type}`,
          type: chartType,
          smooth: chartType === "line" ? 0.4 : false,
          cursor: "default",
          data: [],
          name: name
            ? `${name} (${hass.localize(
                `ui.components.statistics_charts.statistic_types.${type}`
              )})`
            : hass.localize(
                `ui.components.statistics_charts.statistic_types.${type}`
              ),
          symbol: "none",
          // minmax sampling operates independently per series, breaking stacking alignment
          // https://github.com/apache/echarts/issues/11879
          sampling: band && drawBands ? "lttb" : "minmax",
          animationDurationUpdate: 0,
          lineStyle: {
            width: 1.5,
          },
          itemStyle:
            chartType === "bar"
              ? {
                  borderColor,
                  borderWidth: 1.5,
                }
              : undefined,
          color: chartType === "bar" ? backgroundColor : borderColor,
        };
        if (chartStacked) {
          series.stack = `band-stacked`;
          series.stackStrategy = "samesign";
          if (chartType === "line") {
            (series as LineSeriesOption).areaStyle = {
              color: color + "3F",
            };
          }
        } else if (band && chartType === "line") {
          series.stack = `band-${statistic_id}`;
          series.stackStrategy = "all";
          if (hiddenStats.has(`${statistic_id}-${bandBottom}`)) {
            // changing the stackOrder forces echarts to render the stacked series that are not hidden #28472
            series.stackOrder = "seriesDesc";
            (series as LineSeriesOption).areaStyle = undefined;
          } else {
            series.stackOrder = "seriesAsc";
            if (type === bandTop) {
              (series as LineSeriesOption).areaStyle = {
                color: color + "3F",
              };
            }
          }
        }
        if (!params.hideLegend) {
          const showLegend = hasMean
            ? type === "mean"
            : displayedLegend === false;
          if (showLegend) {
            statLegendData.push({
              id: statistic_id,
              name,
              color: series.color as ZRColor,
              borderColor: series.itemStyle?.borderColor,
              noLabelClick: isExternalStatistic(statistic_id),
            });
          }
          displayedLegend = displayedLegend || showLegend;
        }
        statDataSets.push(series);
        statisticIds.push(statistic_id);
      }
    });

    let prevDate: Date | null = null;
    // Process chart data.
    let firstSum: number | null | undefined = null;
    stats.forEach((stat) => {
      const startDate = new Date(stat.start);
      const endDate = new Date(stat.end);
      if (prevDate === startDate) {
        return;
      }
      prevDate = startDate;
      const dataValues: (number | null)[][] = [];
      statTypes.forEach((type) => {
        const val: (number | null)[] = [];
        if (type === "sum") {
          if (firstSum === null || firstSum === undefined) {
            val.push(0);
            firstSum = stat.sum;
          } else {
            val.push((stat.sum || 0) - firstSum);
          }
        } else if (
          type === bandTop &&
          chartType === "line" &&
          drawBands &&
          !hiddenStats.has(`${statistic_id}-${bandBottom}`)
        ) {
          const top = stat[bandTop] || 0;
          val.push(Math.abs(top - (stat[bandBottom] || 0)));
          val.push(top);
        } else {
          val.push(stat[type] ?? null);
        }
        dataValues.push(val);
      });
      if (!hiddenStats.has(statistic_id)) {
        pushData(startDate, endDate, endTime, dataValues);
      }
    });

    // For line charts, close out the last stat segment at prevEndTime
    const lastEndTime = prevEndTime;
    const lastValues = prevValues;
    if (chartType === "line" && lastEndTime && lastValues) {
      statDataSets.forEach((d, i) => {
        d.data!.push([lastEndTime, ...lastValues[i]!]);
      });
    }

    // Show current state if required, and units match (or are unknown)
    const statisticUnit = getDisplayUnit(hass, statistic_id, meta);
    if (
      displayCurrentState &&
      !chartStacked &&
      (!unit || !statisticUnit || unit === statisticUnit)
    ) {
      // Skip external statistics
      if (!isExternalStatistic(statistic_id)) {
        const stateObj = hass.states[statistic_id];
        if (stateObj) {
          const currentValue = parseFloat(stateObj.state);
          if (isFinite(currentValue) && !hiddenStats.has(statistic_id)) {
            // Then push the current state at now
            statTypes.forEach((type, i) => {
              if (type === "sum" || type === "change") {
                // Skip cumulative types - need special calculation.
                return;
              }
              const val: (number | null)[] = [];
              if (
                type === bandTop &&
                chartType === "line" &&
                drawBands &&
                !hiddenStats.has(`${statistic_id}-${bandBottom}`)
              ) {
                // For band chart, current value is both min and max, so diff is 0
                val.push(0);
                val.push(currentValue);
              } else {
                val.push(currentValue);
              }
              statDataSets[i].data!.push([now, ...val]);
              trackY(val[val.length - 1]);
            });
          }
        }
      }
    }

    // Concat two arrays
    Array.prototype.push.apply(totalDataSets, statDataSets);
    Array.prototype.push.apply(legendData, statLegendData);
  });

  if (chartType === "bar") {
    fillDataGapsAndRoundCaps(totalDataSets as BarSeriesOption[], chartStacked);
  }

  legendData.forEach(({ id, name, color, borderColor }) => {
    // Add an empty series for the legend
    totalDataSets.push({
      id: id,
      name: name,
      color,
      itemStyle: {
        borderColor,
      },
      type: chartType,
      data: [],
      xAxisIndex: 1,
    });
  });

  return {
    datasets: totalDataSets,
    legendData,
    statisticIds,
    unit,
    yAxisFractionDigits: computeYAxisFractionDigits(yMin, yMax),
  };
}
