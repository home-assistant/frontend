import { TZDate } from "@date-fns/tz";
import type { HassConfig } from "home-assistant-js-websocket";
import type { FrontendLocaleData } from "../../../data/translation";
import { resolveTimeZone } from "../../../common/datetime/resolve-time-zone";
import { formatDateFromParts, getDateFormatConfig } from "./date-format";
import type { DateCardConfig } from "./types";

/**
 * Formats the card's default (no date_format configured) display. A single
 * Intl.DateTimeFormat call lets the locale control field order and
 * punctuation.
 */
const formatDefaultDate = (
  dateObj: Date,
  language: string,
  timeZone: string
): string =>
  new Intl.DateTimeFormat(language, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(dateObj);

/**
 * Whether Intl accepts `timeZone` as a valid IANA zone. YAML-authored
 * configs bypass the editor's picker, so an unchecked bad value would
 * otherwise only surface as a crash later, when the card formats a date.
 */
export const isValidTimeZone = (timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
};

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
 * Formats "now" per the card's configured date_format tokens (same token
 * system as the Clock card), falling back to `formatDefaultDate` when no
 * tokens are configured.
 */
export const computeDateText = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig,
  cardConfig: DateCardConfig
): string => {
  const { parts } = getDateFormatConfig(cardConfig);
  const timeZone = computeResolvedTimeZone(locale, config, cardConfig);

  if (!parts.length) {
    return formatDefaultDate(dateObj, locale.language, timeZone);
  }

  return formatDateFromParts(dateObj, { parts }, locale.language, timeZone);
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
