import { TZDate } from "@date-fns/tz";
import type { HassConfig } from "home-assistant-js-websocket";
import type { FrontendLocaleData } from "../../../data/translation";
import { resolveTimeZone } from "../../../common/datetime/resolve-time-zone";
import {
  formatDate,
  formatDateNumeric,
  formatDateShort,
  formatDateVeryShort,
  formatDateWeekdayDay,
  formatDateWeekdayShortDate,
  formatDateWeekdayVeryShortDate,
} from "../../../common/datetime/format_date";
import type { DateCardConfig } from "./types";

type DateFormatter = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig,
  timeZoneOverride?: string
) => string;

export const DATE_CARD_FORMATTERS: Record<
  NonNullable<DateCardConfig["date_format"]>,
  DateFormatter
> = {
  weekday_day: formatDateWeekdayDay,
  long: formatDate,
  short: formatDateShort,
  numeric: formatDateNumeric,
  very_short: formatDateVeryShort,
  weekday_very_short_date: formatDateWeekdayVeryShortDate,
  weekday_short_date: formatDateWeekdayShortDate,
};

export const DEFAULT_DATE_FORMAT: NonNullable<DateCardConfig["date_format"]> =
  "weekday_day";

/**
 * Resolves the actual IANA time zone the card should display, honoring a
 * card-level override before falling back to the user's profile/server
 * setting (same fallback chain as the Clock card).
 */
export const computeResolvedTimeZone = (
  locale: FrontendLocaleData,
  config: HassConfig,
  cardConfig: DateCardConfig
): string =>
  cardConfig.time_zone || resolveTimeZone(locale.time_zone, config.time_zone);

/**
 * Formats "now" per the card's configured date_format, passing a card-level
 * time_zone override straight through to the formatter rather than faking
 * locale/config to influence resolveTimeZone.
 */
export const computeDateText = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig,
  cardConfig: DateCardConfig
): string => {
  const formatter =
    DATE_CARD_FORMATTERS[cardConfig.date_format ?? DEFAULT_DATE_FORMAT] ??
    DATE_CARD_FORMATTERS[DEFAULT_DATE_FORMAT];

  return formatter(dateObj, locale, config, cardConfig.time_zone);
};

/**
 * Milliseconds from `dateObj` until the next wall-clock midnight in
 * `timeZone`, computed via TZDate (same approach as ha-full-calendar.ts) so
 * it stays correct across DST transitions instead of assuming 1 wall-clock
 * hour always equals 1 real hour.
 */
export const computeMsUntilMidnight = (
  dateObj: Date,
  timeZone: string
): number => {
  const nextMidnight = new TZDate(dateObj, timeZone);
  nextMidnight.setHours(24, 0, 0, 0);
  return nextMidnight.getTime() - dateObj.getTime();
};
