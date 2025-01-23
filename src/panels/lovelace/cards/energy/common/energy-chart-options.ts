import type { HassConfig } from "home-assistant-js-websocket";
import { addHours, subHours, differenceInDays } from "date-fns";
import type {
  BarSeriesOption,
  CallbackDataParams,
  TopLevelFormatterParams,
} from "echarts/types/dist/shared";
import type { FrontendLocaleData } from "../../../../../data/translation";
import { formatNumber } from "../../../../../common/number/format_number";
import { formatDateVeryShort } from "../../../../../common/datetime/format_date";
import { formatTime } from "../../../../../common/datetime/format_time";
import type { ECOption } from "../../../../../resources/echarts";
import { getTimeAxisLabelConfig } from "../../../../../components/chart/axis-label";

export function getSuggestedMax(dayDifference: number, end: Date): number {
  let suggestedMax = new Date(end);

  // Sometimes around DST we get a time of 0:59 instead of 23:59 as expected.
  // Correct for this when showing days/months so we don't get an extra day.
  if (dayDifference > 2 && suggestedMax.getHours() === 0) {
    suggestedMax = subHours(suggestedMax, 1);
  }

  suggestedMax.setMinutes(0, 0, 0);
  if (dayDifference > 35) {
    suggestedMax.setDate(1);
  }
  if (dayDifference > 2) {
    suggestedMax.setHours(0);
  }
  return suggestedMax.getTime();
}

export function getSuggestedPeriod(
  dayDifference: number
): "month" | "day" | "hour" {
  return dayDifference > 35 ? "month" : dayDifference > 2 ? "day" : "hour";
}

export function getCommonOptions(
  start: Date,
  end: Date,
  locale: FrontendLocaleData,
  config: HassConfig,
  unit?: string,
  compareStart?: Date,
  compareEnd?: Date,
  formatTotal?: (total: number) => string
): ECOption {
  const dayDifference = differenceInDays(end, start);
  const compare = compareStart !== undefined && compareEnd !== undefined;

  const options: ECOption = {
    xAxis: {
      id: "xAxisMain",
      type: "time",
      min: start.getTime(),
      max: getSuggestedMax(dayDifference, end),
      axisLabel: getTimeAxisLabelConfig(locale, config, dayDifference),
      axisLine: {
        show: false,
      },
      splitLine: {
        show: true,
      },
      minInterval:
        dayDifference >= 89 // quarter
          ? 28 * 3600 * 24 * 1000
          : dayDifference > 2
            ? 3600 * 24 * 1000
            : undefined,
    },
    yAxis: {
      type: "value",
      name: unit,
      nameGap: 5,
      axisLabel: {
        formatter: (value: number) => formatNumber(Math.abs(value), locale),
      },
      splitLine: {
        show: true,
      },
    },
    grid: {
      top: 35,
      bottom: 10,
      left: 10,
      right: 10,
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
            .filter((items) => items.length > 0)
            .map((items) =>
              formatTooltip(
                items,
                locale,
                config,
                dayDifference,
                compare,
                unit,
                formatTotal
              )
            )
            .join("<br><br>");
        }
        return formatTooltip(
          [params],
          locale,
          config,
          dayDifference,
          compare,
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
  dayDifference: number,
  compare: boolean | null,
  unit?: string,
  formatTotal?: (total: number) => string
) {
  if (!params[0].value) {
    return "";
  }
  // when comparing the first value is offset to match the main period
  // and the real date is in the third value
  const date = new Date(params[0].value?.[2] ?? params[0].value?.[0]);
  let period: string;
  if (dayDifference > 0) {
    period = `${formatDateVeryShort(date, locale, config)}`;
  } else {
    period = `${
      compare ? `${formatDateVeryShort(date, locale, config)}: ` : ""
    }${formatTime(date, locale, config)} – ${formatTime(
      addHours(date, 1),
      locale,
      config
    )}`;
  }
  const title = `<h4 style="text-align: center; margin: 0;">${period}</h4>`;

  let sumPositive = 0;
  let countPositive = 0;
  let sumNegative = 0;
  let countNegative = 0;
  const values = params
    .map((param) => {
      const y = param.value?.[1] as number;
      const value = formatNumber(y, locale);
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
      return `${param.marker} ${param.seriesName}: ${value} ${unit}`;
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
        .map((dataset) => dataset.data!.map((datapoint) => datapoint![0]))
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
      if (x !== bucket) {
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
