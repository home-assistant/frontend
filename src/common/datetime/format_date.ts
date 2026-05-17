import type { HassConfig } from "home-assistant-js-websocket";
import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";
import type { FrontendLocaleData } from "../../data/translation";
import { DateFormat } from "../../data/translation";
import { resolveTimeZone } from "./resolve-time-zone";

// Helper to get date in target timezone
const toTimeZone = (date: Date, timeZone: string): Date => {
  try {
    return new TZDate(date, timeZone);
  } catch {
    return date;
  }
};

// Helper to get format string based on date preference
const formatForDatePreference = (
  template: { DMY: string; MDY: string; YMD: string },
  locale: FrontendLocaleData
): string => {
  if (
    locale.date_format === DateFormat.language ||
    locale.date_format === DateFormat.system
  ) {
    return template.MDY; // Default to MDY for browser locale
  }

  const pattern =
    template[locale.date_format as unknown as keyof typeof template];
  return pattern || template.MDY; // Fallback to MDY if not found
};

// Tuesday, August 10
export const formatDateWeekdayDay = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const timeZone = resolveTimeZone(locale.time_zone, config.time_zone);
  const zonedDate = toTimeZone(dateObj, timeZone);
  const pattern = formatForDatePreference(
    { DMY: "EEEE, d MMMM", MDY: "EEEE, MMMM d", YMD: "EEEE, MMMM d" },
    locale
  );
  return format(zonedDate, pattern);
};

// August 10, 2021
export const formatDate = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const timeZone = resolveTimeZone(locale.time_zone, config.time_zone);
  const zonedDate = toTimeZone(dateObj, timeZone);
  const pattern = formatForDatePreference(
    {
      DMY: "d MMMM, yyyy",
      MDY: "MMMM d, yyyy",
      YMD: "yyyy, MMMM d",
    },
    locale
  );
  return format(zonedDate, pattern);
};

// Aug 10, 2021
export const formatDateShort = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const timeZone = resolveTimeZone(locale.time_zone, config.time_zone);
  const zonedDate = toTimeZone(dateObj, timeZone);
  const pattern = formatForDatePreference(
    {
      DMY: "d MMM, yyyy",
      MDY: "MMM d, yyyy",
      YMD: "yyyy, MMM d",
    },
    locale
  );
  return format(zonedDate, pattern);
};

// 10/08/2021
export const formatDateNumeric = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const formatter = createDateNumericFormatter(locale, config.time_zone);

  if (
    locale.date_format === DateFormat.language ||
    locale.date_format === DateFormat.system
  ) {
    return formatter.format(dateObj);
  }

  const parts = formatter.formatToParts(dateObj);

  const literal = parts.find((value) => value.type === "literal")?.value;
  const day = parts.find((value) => value.type === "day")?.value;
  const month = parts.find((value) => value.type === "month")?.value;
  const year = parts.find((value) => value.type === "year")?.value;

  const lastPart = parts[parts.length - 1];
  let lastLiteral = lastPart?.type === "literal" ? lastPart?.value : "";

  if (locale.language === "bg" && locale.date_format === DateFormat.YMD) {
    lastLiteral = "";
  }

  const formats = {
    [DateFormat.DMY]: `${day}${literal}${month}${literal}${year}${lastLiteral}`,
    [DateFormat.MDY]: `${month}${literal}${day}${literal}${year}${lastLiteral}`,
    [DateFormat.YMD]: `${year}${literal}${month}${literal}${day}${lastLiteral}`,
  };

  return formats[locale.date_format];
};

const createDateNumericFormatter = (
  locale: FrontendLocaleData,
  serverTimeZone: string
) => {
  const localeString =
    locale.date_format === DateFormat.system ? undefined : locale.language;
  return new Intl.DateTimeFormat(localeString, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: resolveTimeZone(locale.time_zone, serverTimeZone),
  });
};

// Aug 10
export const formatDateVeryShort = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const timeZone = resolveTimeZone(locale.time_zone, config.time_zone);
  const zonedDate = toTimeZone(dateObj, timeZone);
  const pattern = formatForDatePreference(
    { DMY: "d MMM", MDY: "MMM d", YMD: "MMM d" },
    locale
  );
  return format(zonedDate, pattern);
};

// August 2021
export const formatDateMonthYear = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const timeZone = resolveTimeZone(locale.time_zone, config.time_zone);
  const zonedDate = toTimeZone(dateObj, timeZone);
  const pattern = formatForDatePreference(
    {
      DMY: "MMMM yyyy",
      MDY: "MMMM yyyy",
      YMD: "yyyy MMMM",
    },
    locale
  );
  return format(zonedDate, pattern);
};

// August
export const formatDateMonth = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const timeZone = resolveTimeZone(locale.time_zone, config.time_zone);
  const zonedDate = toTimeZone(dateObj, timeZone);
  return format(zonedDate, "MMMM");
};

// Aug
export const formatDateMonthShort = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const timeZone = resolveTimeZone(locale.time_zone, config.time_zone);
  const zonedDate = toTimeZone(dateObj, timeZone);
  return format(zonedDate, "MMM");
};

// 2021
export const formatDateYear = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const timeZone = resolveTimeZone(locale.time_zone, config.time_zone);
  const zonedDate = toTimeZone(dateObj, timeZone);
  return format(zonedDate, "yyyy");
};

// Monday
export const formatDateWeekday = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const timeZone = resolveTimeZone(locale.time_zone, config.time_zone);
  const zonedDate = toTimeZone(dateObj, timeZone);
  return format(zonedDate, "EEEE");
};

// Mon
export const formatDateWeekdayShort = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const timeZone = resolveTimeZone(locale.time_zone, config.time_zone);
  const zonedDate = toTimeZone(dateObj, timeZone);
  return format(zonedDate, "EEE");
};

// Mon, Aug 10
export const formatDateWeekdayVeryShortDate = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const timeZone = resolveTimeZone(locale.time_zone, config.time_zone);
  const zonedDate = toTimeZone(dateObj, timeZone);
  return format(zonedDate, "EEE, MMM d");
};

// Mon, Aug 10, 2021
export const formatDateWeekdayShortDate = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const timeZone = resolveTimeZone(locale.time_zone, config.time_zone);
  const zonedDate = toTimeZone(dateObj, timeZone);
  return format(zonedDate, "EEE, MMM d, yyyy");
};

/**
 * Format a date as YYYY-MM-DD
 */
export const formatISODateOnly = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const timeZone = resolveTimeZone(locale.time_zone, config.time_zone);
  const zonedDate = toTimeZone(dateObj, timeZone);
  return format(zonedDate, "yyyy-MM-dd");
};

// 2026-08-10/2026-08-15
export const formatCallyDateRange = (
  start: Date,
  end: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const startDate = formatISODateOnly(start, locale, config);
  const endDate = formatISODateOnly(end, locale, config);

  return `${startDate}/${endDate}`;
};
