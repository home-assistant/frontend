import { ChartOptions } from "chart.js";
import { HassConfig } from "home-assistant-js-websocket";
import {
  addHours,
  subHours,
  differenceInDays,
  differenceInHours,
} from "date-fns/esm";
import { FrontendLocaleData } from "../../../../../data/translation";
import {
  formatNumber,
  numberFormatToLocale,
} from "../../../../../common/number/format_number";
import { formatDateVeryShort } from "../../../../../common/datetime/format_date";
import { formatTime } from "../../../../../common/datetime/format_time";

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

export function getCommonOptions(
  start: Date,
  end: Date,
  locale: FrontendLocaleData,
  config: HassConfig,
  unit?: string,
  compareStart?: Date,
  compareEnd?: Date
): ChartOptions {
  const dayDifference = differenceInDays(end, start);
  const compare = compareStart !== undefined && compareEnd !== undefined;
  if (compare && dayDifference <= 35) {
    const difference = differenceInHours(end, start);
    const differenceCompare = differenceInHours(compareEnd!, compareStart!);
    // If the compare period doesn't match the main period, adjust them to match
    if (differenceCompare > difference) {
      end = addHours(end, differenceCompare - difference);
    } else if (difference > differenceCompare) {
      compareEnd = addHours(compareEnd!, difference - differenceCompare);
    }
  }

  const options: ChartOptions = {
    parsing: false,
    animation: false,
    interaction: {
      mode: "x",
    },
    scales: {
      x: {
        type: "time",
        suggestedMin: start.getTime(),
        max: getSuggestedMax(dayDifference, end),
        adapters: {
          date: {
            locale,
            config,
          },
        },
        ticks: {
          maxRotation: 0,
          sampleSize: 5,
          autoSkipPadding: 20,
          font: (context) =>
            context.tick && context.tick.major
              ? ({ weight: "bold" } as any)
              : {},
        },
        time: {
          tooltipFormat:
            dayDifference > 35
              ? "monthyear"
              : dayDifference > 7
                ? "date"
                : dayDifference > 2
                  ? "weekday"
                  : dayDifference > 0
                    ? "datetime"
                    : "hour",
          minUnit:
            dayDifference > 35 ? "month" : dayDifference > 2 ? "day" : "hour",
        },
      },
      y: {
        stacked: true,
        type: "linear",
        title: {
          display: true,
          text: unit,
        },
        ticks: {
          beginAtZero: true,
          callback: (value) => formatNumber(Math.abs(value), locale),
        },
      },
    },
    plugins: {
      tooltip: {
        position: "nearest",
        filter: (val) => val.formattedValue !== "0",
        itemSort: function (a, b) {
          return b.datasetIndex - a.datasetIndex;
        },
        callbacks: {
          title: (datasets) => {
            if (dayDifference > 0) {
              return datasets[0].label;
            }
            const date = new Date(datasets[0].parsed.x);
            return `${
              compare ? `${formatDateVeryShort(date, locale, config)}: ` : ""
            }${formatTime(date, locale, config)} – ${formatTime(
              addHours(date, 1),
              locale,
              config
            )}`;
          },
          label: (context) =>
            `${context.dataset.label}: ${formatNumber(
              context.parsed.y,
              locale
            )} ${unit}`,
        },
      },
      filler: {
        propagate: false,
      },
      legend: {
        display: false,
        labels: {
          usePointStyle: true,
        },
      },
    },
    elements: {
      bar: { borderWidth: 1.5, borderRadius: 4 },
      point: {
        hitRadius: 50,
      },
    },
    // @ts-expect-error
    locale: numberFormatToLocale(locale),
  };
  if (compare) {
    options.scales!.xAxisCompare = {
      ...(options.scales!.x as Record<string, any>),
      suggestedMin: compareStart!.getTime(),
      max: getSuggestedMax(dayDifference, compareEnd!),
      display: false,
    };
  }
  return options;
}
