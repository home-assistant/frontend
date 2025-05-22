import type { HassConfig } from "home-assistant-js-websocket";
import type { FrontendLocaleData } from "../../data/translation";
import {
  formatDateMonth,
  formatDateMonthYear,
  formatDateVeryShort,
  formatDateWeekdayShort,
} from "../../common/datetime/format_date";
import {
  formatTime,
  formatTimeWithSeconds,
} from "../../common/datetime/format_time";

export function formatTimeLabel(
  value: number | Date,
  locale: FrontendLocaleData,
  config: HassConfig,
  minutesDifference: number
) {
  const dayDifference = minutesDifference / 60 / 24;
  const date = new Date(value);
  if (dayDifference > 88) {
    return date.getMonth() === 0
      ? `{bold|${formatDateMonthYear(date, locale, config)}}`
      : formatDateMonth(date, locale, config);
  }
  if (dayDifference > 35) {
    return date.getDate() === 1
      ? `{bold|${formatDateVeryShort(date, locale, config)}}`
      : formatDateVeryShort(date, locale, config);
  }
  if (dayDifference > 7) {
    const label = formatDateVeryShort(date, locale, config);
    return date.getDate() === 1 ? `{bold|${label}}` : label;
  }
  if (dayDifference > 2) {
    return formatDateWeekdayShort(date, locale, config);
  }
  if (minutesDifference && minutesDifference < 5) {
    return formatTimeWithSeconds(date, locale, config);
  }
  if (
    date.getHours() === 0 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0
  ) {
    // show only date for the beginning of the day
    return `{bold|${formatDateVeryShort(date, locale, config)}}`;
  }
  return formatTime(date, locale, config);
}
