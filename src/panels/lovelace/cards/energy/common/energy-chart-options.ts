import type { HassConfig } from "home-assistant-js-websocket";
import { addHours, subHours, differenceInDays } from "date-fns";
import type { FrontendLocaleData } from "../../../../../data/translation";
import { formatNumber } from "../../../../../common/number/format_number";
import { formatDateVeryShort } from "../../../../../common/datetime/format_date";
import { formatTime } from "../../../../../common/datetime/format_time";
import type { ECOption } from "../../../../../resources/echarts";

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
  darkMode?: boolean
): ECOption {
  const dayDifference = differenceInDays(end, start);
  const compare = compareStart !== undefined && compareEnd !== undefined;
  const splitLineStyle = darkMode ? { opacity: 0.15 } : {};

  const options: ECOption = {
    xAxis: {
      id: "xAxisMain",
      type: "time",
      min: start.getTime(),
      max: getSuggestedMax(dayDifference, end),
      axisLabel: {
        formatter: (value: number) => {
          const date = new Date(value);
          // show only date for the beginning of the day
          if (
            date.getHours() === 0 &&
            date.getMinutes() === 0 &&
            date.getSeconds() === 0
          ) {
            return `{day|${formatDateVeryShort(date, locale, config)}}`;
          }
          return formatTime(date, locale, config);
        },
        rich: {
          day: {
            fontWeight: "bold",
          },
        },
      },
      axisLine: {
        show: false,
      },
      splitLine: {
        show: true,
        lineStyle: splitLineStyle,
      },
    },
    yAxis: {
      type: "value",
      name: unit,
      axisLabel: {
        formatter: (value: number) => formatNumber(Math.abs(value), locale),
      },
    },
    grid: {
      top: 10,
      bottom: 10,
      left: 10,
      right: 10,
      containLabel: true,
    },
    tooltip: {
      // trigger: "axis",
      formatter: (args: any) => {
        // trigger: "axis" gives an array of params, but "item" gives a single param
        const params = Array.isArray(args) ? args : [args];
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
        const values = params
          .map((param) => {
            const value = formatNumber(param.value[1] as number, locale);
            return value === "0"
              ? false
              : `${param.marker} ${param.seriesName}: ${value} kWh`;
          })
          .filter(Boolean);
        return `${title}${values.join("<br>")}`;
      },
    },
    // scales: {
    //   x: {
    //     time: {
    //       tooltipFormat:
    //         dayDifference > 35
    //           ? "monthyear"
    //           : dayDifference > 7
    //             ? "date"
    //             : dayDifference > 2
    //               ? "weekday"
    //               : dayDifference > 0
    //                 ? "datetime"
    //                 : "hour",
    //       minUnit: getSuggestedPeriod(dayDifference),
    //     },
    //   },
    // },
    // plugins: {
    //   tooltip: {
    //     position: "nearest",
    //     filter: (val) => val.formattedValue !== "0",
    //     itemSort: function (a, b) {
    //       return b.datasetIndex - a.datasetIndex;
    //     },
    //     callbacks: {
    //       title: (datasets) => {
    //         if (dayDifference > 0) {
    //           return datasets[0].label;
    //         }
    //         const date = new Date(datasets[0].parsed.x);
    //         return `${
    //           compare ? `${formatDateVeryShort(date, locale, config)}: ` : ""
    //         }${formatTime(date, locale, config)} – ${formatTime(
    //           addHours(date, 1),
    //           locale,
    //           config
    //         )}`;
    //       },
    //       label: (context) =>
    //         `${context.dataset.label}: ${formatNumber(
    //           context.parsed.y,
    //           locale
    //         )} ${unit}`,
    //     },
    //   },
    // },
  };
  return options;
}
