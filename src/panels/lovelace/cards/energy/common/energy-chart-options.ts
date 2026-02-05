import type { HassConfig } from "home-assistant-js-websocket";
import {
  differenceInMonths,
  subHours,
  differenceInDays,
  differenceInYears,
  startOfYear,
  addMilliseconds,
  startOfMonth,
  addYears,
  addMonths,
  addHours,
  startOfDay,
  addDays,
} from "date-fns";
import type {
  BarSeriesOption,
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
} from "../../../../../common/datetime/format_date";
import { formatTime } from "../../../../../common/datetime/format_time";
import type { ECOption } from "../../../../../resources/echarts/echarts";
import { filterXSS } from "../../../../../common/util/xss";
import type { StatisticPeriod } from "../../../../../data/recorder";
import { getSuggestedPeriod } from "../../../../../data/energy";

export function getSuggestedMax(period: StatisticPeriod, end: Date): Date {
  let suggestedMax = new Date(end);

  if (period === "5minute") {
    return suggestedMax;
  }
  suggestedMax.setMinutes(0, 0, 0);
  if (period === "hour") {
    return suggestedMax;
  }
  // Sometimes around DST we get a time of 0:59 instead of 23:59 as expected.
  // Correct for this when showing days/months so we don't get an extra day.
  if (suggestedMax.getHours() === 0) {
    suggestedMax = subHours(suggestedMax, 1);
  }
  suggestedMax.setHours(0);
  if (period === "day" || period === "week") {
    return suggestedMax;
  }
  // period === month
  suggestedMax.setDate(1);
  return suggestedMax;
}

function createYAxisLabelFormatter(locale: FrontendLocaleData) {
  let previousValue: number | undefined;

  return (value: number): string => {
    const maximumFractionDigits = Math.max(
      1,
      -Math.floor(Math.log10(Math.abs(value - (previousValue ?? value) || 1)))
    );
    previousValue = value;
    return formatNumber(value, locale, { maximumFractionDigits });
  };
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
  detailedDailyData = false
): ECOption {
  const suggestedPeriod = getSuggestedPeriod(start, end, detailedDailyData);

  const compare = compareStart !== undefined && compareEnd !== undefined;
  const showCompareYear =
    compare && start.getFullYear() !== compareStart.getFullYear();

  const options: ECOption = {
    xAxis: {
      type: "time",
      min: start,
      max: getSuggestedMax(suggestedPeriod, end),
    },
    yAxis: {
      type: "value",
      name: unit,
      nameGap: 2,
      nameTextStyle: {
        align: "left",
      },
      axisLabel: {
        formatter: createYAxisLabelFormatter(locale),
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
      formatter: (params: TopLevelFormatterParams): string => {
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
          return [mainItems, compareItems]
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
            .filter(Boolean)
            .join("<br><br>");
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
) {
  if (!params[0]?.value) {
    return "";
  }
  // when comparing the first value is offset to match the main period
  // and the real date is in the third value
  const date = new Date(params[0].value?.[2] ?? params[0].value?.[0]);
  let period: string;

  if (suggestedPeriod === "month") {
    period = `${formatDateMonthYear(date, locale, config)}`;
  } else if (suggestedPeriod === "day") {
    period = `${(showCompareYear ? formatDateShort : formatDateVeryShort)(date, locale, config)}`;
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
  const title = `<h4 style="text-align: center; margin: 0;">${period}</h4>`;

  let sumPositive = 0;
  let countPositive = 0;
  let sumNegative = 0;
  let countNegative = 0;
  const values = params
    .map((param) => {
      const y = param.value?.[1] as number;
      const value = formatNumber(
        y,
        locale,
        y < 0.1 ? { maximumFractionDigits: 3 } : undefined
      );
      if (value === "0") {
        return false;
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
      return `${param.marker} ${filterXSS(param.seriesName!)}: <div style="direction:ltr; display: inline;">${value} ${unit}</div>`;
    })
    .filter(Boolean);
  let footer = "";
  if (sumPositive !== 0 && countPositive > 1 && formatTotal) {
    footer += `<br><b>${formatTotal(sumPositive)}</b>`;
  }
  if (sumNegative !== 0 && countNegative > 1 && formatTotal) {
    footer += `<br><b>${formatTotal(sumNegative)}</b>`;
  }
  return values.length > 0 ? `${title}${values.join("<br>")}${footer}` : "";
}

export function fillDataGapsAndRoundCaps(datasets: BarSeriesOption[]) {
  const buckets = Array.from(
    new Set(
      datasets
        .map((dataset) =>
          dataset.data!.map((datapoint) => Number(datapoint![0]))
        )
        .flat()
    )
  ).sort((a, b) => a - b);

  // make sure all datasets have the same buckets
  // otherwise the chart will render incorrectly in some cases
  buckets.forEach((bucket, index) => {
    const capRounded = {};
    const capRoundedNegative = {};
    for (let i = datasets.length - 1; i >= 0; i--) {
      const dataPoint = datasets[i].data![index];
      const item: any =
        dataPoint && typeof dataPoint === "object" && "value" in dataPoint
          ? dataPoint
          : { value: dataPoint };
      const x = item.value?.[0];
      const stack = datasets[i].stack ?? "";
      if (x === undefined) {
        continue;
      }
      if (Number(x) !== bucket) {
        datasets[i].data?.splice(index, 0, {
          value: [bucket, 0],
          itemStyle: {
            borderWidth: 0,
          },
        });
      } else if (item.value?.[1] === 0) {
        // remove the border for zero values or it will be rendered
        datasets[i].data![index] = {
          ...item,
          itemStyle: {
            ...item.itemStyle,
            borderWidth: 0,
          },
        };
      } else if (!capRounded[stack] && item.value?.[1] > 0) {
        datasets[i].data![index] = {
          ...item,
          itemStyle: {
            ...item.itemStyle,
            borderRadius: [4, 4, 0, 0],
          },
        };
        capRounded[stack] = true;
      } else if (!capRoundedNegative[stack] && item.value?.[1] < 0) {
        datasets[i].data![index] = {
          ...item,
          itemStyle: {
            ...item.itemStyle,
            borderRadius: [0, 0, 4, 4],
          },
        };
        capRoundedNegative[stack] = true;
      }
    }
  });
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

export function getCompareTransform(start: Date, compareStart?: Date) {
  if (!compareStart) {
    return (ts: Date) => ts;
  }
  const compareYearDiff = differenceInYears(start, compareStart);
  if (
    compareYearDiff !== 0 &&
    start.getTime() === startOfYear(start).getTime()
  ) {
    return (ts: Date) => addYears(ts, compareYearDiff);
  }
  const compareMonthDiff = differenceInMonths(start, compareStart);
  if (
    compareMonthDiff !== 0 &&
    start.getTime() === startOfMonth(start).getTime()
  ) {
    return (ts: Date) => addMonths(ts, compareMonthDiff);
  }
  const compareDayDiff = differenceInDays(start, compareStart);
  if (compareDayDiff !== 0 && start.getTime() === startOfDay(start).getTime()) {
    return (ts: Date) => addDays(ts, compareDayDiff);
  }
  const compareOffset = start.getTime() - compareStart.getTime();
  return (ts: Date) => addMilliseconds(ts, compareOffset);
}
