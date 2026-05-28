import type { HassConfig } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { html, nothing } from "lit";
import {
  subHours,
  differenceInDays,
  differenceInMonths,
  differenceInCalendarMonths,
  differenceInYears,
  startOfYear,
  addMilliseconds,
  startOfMonth,
  addYears,
  addMonths,
  addHours,
  startOfDay,
  addDays,
  subDays,
} from "date-fns";
import type {
  CallbackDataParams,
  LineSeriesOption,
  TopLevelFormatterParams,
} from "echarts/types/dist/shared";
import type { LineDataItemOption } from "echarts/types/src/chart/line/LineSeries";
import type { FrontendLocaleData } from "../../../../../data/translation";
import { formatNumber } from "../../../../../common/number/format_number";
import {
  formatDateMonthYear,
  formatDateShort,
  formatDateVeryShort,
  formatDateWeekdayShortDate,
  formatDateWeekdayVeryShortDate,
} from "../../../../../common/datetime/format_date";
import { formatTime } from "../../../../../common/datetime/format_time";
import type { HaECOption } from "../../../../../resources/echarts/echarts";
import type { StatisticPeriod } from "../../../../../data/recorder";
import { getPeriodicAxisLabelConfig } from "../../../../../components/chart/axis-label";
import "../../../../../components/chart/ha-chart-tooltip-marker";
import { getSuggestedPeriod } from "../../../../../data/energy";

export { fillDataGapsAndRoundCaps } from "../../../../../components/chart/round-caps";

/**
 * Energy chart data point tuple:
 * [0] displayX  - bar position (midpoint for sub-daily periods, start otherwise)
 * [1] value     - the energy value
 * [2] originalStart - original period start timestamp, used for tooltips
 */
export type EnergyDataPoint = [
  displayX: number,
  value: number,
  originalStart: number,
];

// Number of days of padding when showing time axis in months
const MONTH_TIME_AXIS_PADDING = 5;

export function getSuggestedMax(
  period: StatisticPeriod,
  end: Date,
  noRounding: boolean
): Date {
  // Maximum period depends on whether plotting a line chart or discrete bars.
  //  - For line charts use noRounding true as we must always plot all the way
  //    to end of a given period, otherwise we cut off the last period of data.
  //  - For bar charts with 5minute intervals, leave the full time range
  //    to ensure we don't cut off any bars
  //  - For bar charts of hourly intervals, round to half-period to avoid excess
  //    padding but not cut off the final bar if placed mid interval.
  //  - For bar charts with whole numbers of days we need to round down to the
  //    start of the final bars period to avoid unnecessary padding of the chart.
  let suggestedMax = new Date(end);

  if (noRounding || period === "5minute") {
    return suggestedMax;
  }
  if (period === "hour") {
    suggestedMax.setMinutes(30, 0, 0);
    return suggestedMax;
  }
  // Sometimes around DST we get a time of 0:59 instead of 23:59 as expected.
  // Correct for this when showing days/months so we don't get an extra day.
  if (suggestedMax.getHours() === 0) {
    suggestedMax = subHours(suggestedMax, 1);
  }
  suggestedMax.setHours(0, 0, 0, 0);
  if (period === "day" || period === "week") {
    return suggestedMax;
  }
  // period === month
  suggestedMax.setDate(1);
  return suggestedMax;
}

function createYAxisLabelFormatter(
  locale: FrontendLocaleData,
  fractionDigits: number
) {
  return (value: number): string =>
    formatNumber(value, locale, { maximumFractionDigits: fractionDigits });
}

export function getCommonOptions(
  start: Date,
  end: Date,
  locale: FrontendLocaleData,
  config: HassConfig,
  unit?: string,
  compareStart?: Date,
  compareEnd?: Date,
  formatTotal?: (total: number) => string,
  detailedDailyData = false,
  yAxisFractionDigits = 1
): HaECOption {
  const suggestedPeriod = getSuggestedPeriod(start, end, detailedDailyData);
  let suggestedMax = getSuggestedMax(suggestedPeriod, end, detailedDailyData);

  const compare = compareStart !== undefined && compareEnd !== undefined;
  const showCompareYear =
    compare && start.getFullYear() !== compareStart.getFullYear();

  // Extend suggestedMax so compare bars that land past the main end
  // (e.g. Feb compared to Jan) stay visible instead of being clipped.
  if (compare) {
    const transformedCompareEnd = getCompareTransform(
      start,
      compareStart
    )(compareEnd);
    if (transformedCompareEnd.getTime() > suggestedMax.getTime()) {
      suggestedMax = getSuggestedMax(
        suggestedPeriod,
        transformedCompareEnd,
        detailedDailyData
      );
    }
  }

  const monthTimeAxis: HaECOption = {
    xAxis: {
      type: "time",
      min: subDays(start, MONTH_TIME_AXIS_PADDING),
      max: addDays(suggestedMax, MONTH_TIME_AXIS_PADDING),
      axisLabel: getPeriodicAxisLabelConfig("month", locale, config),
      // For shorter month ranges, force splitting to ensure time axis renders
      // as whole month intervals. Limit the number of forced ticks to 6 months
      // (so a max calendar difference of 5) to reduce clutter.
      splitNumber: Math.min(differenceInCalendarMonths(end, start), 5),
    },
  };
  const normalTimeAxis: HaECOption = {
    xAxis: {
      type: "time",
      min: start,
      max: suggestedMax,
    },
  };

  const options: HaECOption = {
    ...(suggestedPeriod === "month" ? monthTimeAxis : normalTimeAxis),
    yAxis: {
      type: "value",
      name: unit,
      nameGap: 2,
      nameTextStyle: {
        align: "left",
      },
      axisLabel: {
        formatter: createYAxisLabelFormatter(locale, yAxisFractionDigits),
      },
      splitLine: {
        show: true,
      },
    },
    grid: {
      top: 15,
      bottom: 0,
      left: 1,
      right: 1,
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: TopLevelFormatterParams) => {
        // trigger: "axis" gives an array of params, but "item" gives a single param
        if (Array.isArray(params)) {
          const mainItems: CallbackDataParams[] = [];
          const compareItems: CallbackDataParams[] = [];
          params.forEach((param: CallbackDataParams) => {
            if (param.seriesId?.startsWith("compare-")) {
              compareItems.push(param);
            } else {
              mainItems.push(param);
            }
          });
          const sections = [mainItems, compareItems]
            .map((items) =>
              formatTooltip(
                items,
                locale,
                config,
                suggestedPeriod,
                compare,
                showCompareYear,
                unit,
                formatTotal
              )
            )
            .filter((s): s is TemplateResult => s !== nothing);
          if (sections.length === 0) return nothing;
          return html`${sections.map(
            (section, i) =>
              html`${i > 0 ? html`<br /><br />` : nothing}${section}`
          )}`;
        }
        return formatTooltip(
          [params],
          locale,
          config,
          suggestedPeriod,
          compare,
          showCompareYear,
          unit,
          formatTotal
        );
      },
    },
  };
  return options;
}

function formatTooltip(
  params: CallbackDataParams[],
  locale: FrontendLocaleData,
  config: HassConfig,
  suggestedPeriod: string,
  compare: boolean | null,
  showCompareYear: boolean,
  unit?: string,
  formatTotal?: (total: number) => string
): TemplateResult | typeof nothing {
  if (!params[0]?.value) {
    return nothing;
  }
  // displayX may be shifted from the period start (see EnergyDataPoint);
  // originalStart has the real date for display. Gap-filled entries lack it.
  const origDate = params.find((p) => p.value?.[2] != null)?.value?.[2];
  const date = new Date(origDate ?? params[0].value?.[0]);
  let period: string;

  if (suggestedPeriod === "month") {
    period = `${formatDateMonthYear(date, locale, config)}`;
  } else if (suggestedPeriod === "day") {
    period = showCompareYear
      ? formatDateWeekdayShortDate(date, locale, config)
      : formatDateWeekdayVeryShortDate(date, locale, config);
  } else {
    period = `${
      compare
        ? `${(showCompareYear ? formatDateShort : formatDateVeryShort)(date, locale, config)}: `
        : ""
    }${formatTime(date, locale, config)}`;
    if (params[0].componentSubType === "bar") {
      period += ` – ${formatTime(addHours(date, 1), locale, config)}`;
    }
  }

  let sumPositive = 0;
  let countPositive = 0;
  let sumNegative = 0;
  let countNegative = 0;
  const rows: TemplateResult[] = [];
  for (const param of params) {
    const y = param.value?.[1] as number;
    const value = formatNumber(
      y,
      locale,
      y < 0.1 ? { maximumFractionDigits: 3 } : undefined
    );
    if (value === "0") {
      continue;
    }
    if (param.componentSubType === "bar") {
      if (y > 0) {
        sumPositive += y;
        countPositive++;
      } else {
        sumNegative += y;
        countNegative++;
      }
    }
    rows.push(
      html`<ha-chart-tooltip-marker
          .color=${String(param.color ?? "")}
        ></ha-chart-tooltip-marker>
        ${param.seriesName}:
        <div style="direction:ltr; display: inline;">${value} ${unit}</div>`
    );
  }
  if (rows.length === 0) {
    return nothing;
  }
  return html`<h4 style="text-align: center; margin: 0;">${period}</h4>
    ${rows.map(
      (row, i) => html`${i > 0 ? html`<br />` : nothing}${row}`
    )}${sumPositive !== 0 && countPositive > 1 && formatTotal
      ? html`<br /><b>${formatTotal(sumPositive)}</b>`
      : nothing}${sumNegative !== 0 && countNegative > 1 && formatTotal
      ? html`<br /><b>${formatTotal(sumNegative)}</b>`
      : nothing}`;
}

function getDatapointX(datapoint: NonNullable<LineSeriesOption["data"]>[0]) {
  const item =
    datapoint && typeof datapoint === "object" && "value" in datapoint
      ? datapoint
      : { value: datapoint };
  return Number(item.value?.[0]);
}

export function fillLineGaps(datasets: LineSeriesOption[]) {
  const buckets = Array.from(
    new Set(
      datasets
        .map((dataset) =>
          dataset.data!.map((datapoint) => getDatapointX(datapoint))
        )
        .flat()
    )
  ).sort((a, b) => a - b);

  datasets.forEach((dataset) => {
    const dataMap = new Map<number, LineDataItemOption>();
    dataset.data!.forEach((datapoint) => {
      const item: LineDataItemOption =
        datapoint && typeof datapoint === "object" && "value" in datapoint
          ? datapoint
          : ({ value: datapoint } as LineDataItemOption);
      const x = getDatapointX(datapoint);
      if (!Number.isNaN(x)) {
        dataMap.set(x, item);
      }
    });

    dataset.data = buckets.map((bucket) => dataMap.get(bucket) ?? [bucket, 0]);
  });

  return datasets;
}

/**
 * Compute the display x-position for an energy bar chart data point.
 * For sub-daily periods (hour/5minute), returns the midpoint to center bars
 * between ticks. For daily or longer periods, returns the start timestamp.
 */
export function computeStatMidpoint(
  start: number,
  end: number,
  period: string,
  compareTransform?: (ts: Date) => Date
): number {
  const center = period === "hour" || period === "5minute";
  if (!center) {
    if (compareTransform) {
      return compareTransform(new Date(start)).getTime();
    }
    return start;
  }
  if (compareTransform) {
    return (
      (compareTransform(new Date(start)).getTime() +
        compareTransform(new Date(end)).getTime()) /
      2
    );
  }
  return (start + end) / 2;
}

export function getCompareTransform(start: Date, compareStart?: Date) {
  if (!compareStart) {
    return (ts: Date) => ts;
  }
  const compareDayDiff = differenceInDays(start, compareStart);
  const compareYearDiff = differenceInYears(start, compareStart);
  if (
    compareYearDiff !== 0 &&
    start.getTime() === startOfYear(start).getTime()
  ) {
    // addYears clamps Feb 29 -> Feb 28 across leap-year boundaries; fall back
    // to a day-shift so each compare day keeps a unique x position.
    return (ts: Date) => {
      const shifted = addYears(ts, compareYearDiff);
      return shifted.getDate() === ts.getDate()
        ? shifted
        : addDays(ts, compareDayDiff);
    };
  }
  const compareMonthDiff = differenceInMonths(start, compareStart);
  if (
    compareMonthDiff !== 0 &&
    start.getTime() === startOfMonth(start).getTime()
  ) {
    // addMonths clamps Jan 31 -> Feb 28 when shifting between unequal-length
    // months; fall back to a day-shift so each compare day keeps a unique x.
    return (ts: Date) => {
      const shifted = addMonths(ts, compareMonthDiff);
      return shifted.getDate() === ts.getDate()
        ? shifted
        : addDays(ts, compareDayDiff);
    };
  }
  if (compareDayDiff !== 0 && start.getTime() === startOfDay(start).getTime()) {
    return (ts: Date) => addDays(ts, compareDayDiff);
  }
  const compareOffset = start.getTime() - compareStart.getTime();
  return (ts: Date) => addMilliseconds(ts, compareOffset);
}
