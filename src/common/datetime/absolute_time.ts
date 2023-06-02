import { isSameDay, isSameYear } from "date-fns";
import { FrontendLocaleData } from "../../data/translation";
import {
  formatShortDateTime,
  formatShortDateTimeWithYear,
} from "./format_date_time";
import { formatTime } from "./format_time";

export const absoluteTime = (
  from: Date,
  locale: FrontendLocaleData,
  to?: Date
): string => {
  const _to = to ?? new Date();

  if (isSameDay(from, _to)) {
    return formatTime(from, locale);
  }
  if (isSameYear(from, _to)) {
    return formatShortDateTime(from, locale);
  }
  return formatShortDateTimeWithYear(from, locale);
};
