import type { HassConfig } from "home-assistant-js-websocket";
import type { XAXisOption } from "echarts/types/dist/shared";
import type { FrontendLocaleData } from "../../data/translation";
import {
  formatDateMonthYearShort,
  formatDateVeryShort,
  formatDateWeekdayShort,
} from "../../common/datetime/format_date";
import { formatTime } from "../../common/datetime/format_time";

export function getLabelFormatter(
  locale: FrontendLocaleData,
  config: HassConfig,
  dayDifference = 0
) {
  return (value: number | Date) => {
    const date = new Date(value);
    if (dayDifference > 35) {
      // month year
      return date.getDate() === 1
        ? `{bold|${formatDateMonthYearShort(date, locale, config)}}`
        : formatDateVeryShort(date, locale, config);
    }
    if (dayDifference > 7) {
      // date
      const label = formatDateVeryShort(date, locale, config);
      return date.getDate() === 1 ? `{bold|${label}}` : label;
    }
    if (dayDifference > 2) {
      // weekday
      return formatDateWeekdayShort(date, locale, config);
    }
    // show only date for the beginning of the day
    if (
      date.getHours() === 0 &&
      date.getMinutes() === 0 &&
      date.getSeconds() === 0
    ) {
      return `{bold|${formatDateVeryShort(date, locale, config)}}`;
    }
    return formatTime(date, locale, config);
  };
}

export function getTimeAxisLabelConfig(
  locale: FrontendLocaleData,
  config: HassConfig,
  dayDifference?: number
): XAXisOption["axisLabel"] {
  return {
    formatter: getLabelFormatter(locale, config, dayDifference),
    rich: {
      bold: {
        fontWeight: "bold",
      },
    },
    hideOverlap: true,
  };
}
