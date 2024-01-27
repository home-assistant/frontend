import { isSameDay, isSameYear } from "date-fns";
import { HassConfig } from "home-assistant-js-websocket";
import { FrontendLocaleData } from "../../data/translation";
import {
  formatShortDateTime,
  formatShortDateTimeWithYear,
} from "./format_date_time";
import { formatTime } from "./format_time";

export const absoluteTime = (
  from: Date,
  locale: FrontendLocaleData,
  config: HassConfig,
  to?: Date
): string => {
  const _to = to ?? new Date();

  if (isSameDay(from, _to)) {
    return formatTime(from, locale, config);
  }
  if (isSameYear(from, _to)) {
    return formatShortDateTime(from, locale, config);
  }
  return formatShortDateTimeWithYear(from, locale, config);
};
