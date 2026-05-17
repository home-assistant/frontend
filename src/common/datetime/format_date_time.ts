import type { HassConfig } from "home-assistant-js-websocket";
import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { DateFormat, type FrontendLocaleData } from "../../data/translation";
import { formatDateNumeric } from "./format_date";
import { formatTime } from "./format_time";
import { resolveTimeZone } from "./resolve-time-zone";
import { useAmPm } from "./use_am_pm";

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

// August 9, 2021, 8:23 AM
export const formatDateTime = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const timeZone = resolveTimeZone(locale.time_zone, config.time_zone);
  const zonedDate = toTimeZone(dateObj, timeZone);
  const isAmPm = useAmPm(locale);
  const pattern = formatForDatePreference(
    {
      DMY: `d MMMM, yyyy 'at' ${isAmPm ? "h:mm a" : "HH:mm"}`,
      MDY: `MMMM d, yyyy 'at' ${isAmPm ? "h:mm a" : "HH:mm"}`,
      YMD: `yyyy, MMMM d 'at' ${isAmPm ? "h:mm a" : "HH:mm"}`,
    },
    locale
  );
  return format(zonedDate, pattern);
};

export const formatDateTimeWithBrowserDefaults = (dateObj: Date) =>
  new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj);

// Aug 9, 2021, 8:23 AM
export const formatShortDateTimeWithYear = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const timeZone = resolveTimeZone(locale.time_zone, config.time_zone);
  const zonedDate = toTimeZone(dateObj, timeZone);
  const isAmPm = useAmPm(locale);
  const pattern = formatForDatePreference(
    {
      DMY: `d MMM, yyyy, ${isAmPm ? "h:mm a" : "HH:mm"}`,
      MDY: `MMM d, yyyy, ${isAmPm ? "h:mm a" : "HH:mm"}`,
      YMD: `yyyy, MMM d, ${isAmPm ? "h:mm a" : "HH:mm"}`,
    },
    locale
  );
  return format(zonedDate, pattern);
};

// Aug 9, 8:23 AM
export const formatShortDateTime = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const timeZone = resolveTimeZone(locale.time_zone, config.time_zone);
  const zonedDate = toTimeZone(dateObj, timeZone);
  const isAmPm = useAmPm(locale);
  const pattern = formatForDatePreference(
    {
      DMY: `d MMM, ${isAmPm ? "h:mm a" : "HH:mm"}`,
      MDY: `MMM d, ${isAmPm ? "h:mm a" : "HH:mm"}`,
      YMD: `MMM d, ${isAmPm ? "h:mm a" : "HH:mm"}`,
    },
    locale
  );
  return format(zonedDate, pattern);
};

export const formatShortDateTimeWithConditionalYear = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const now = new Date();
  if (now.getFullYear() === dateObj.getFullYear()) {
    return formatShortDateTime(dateObj, locale, config);
  }
  return formatShortDateTimeWithYear(dateObj, locale, config);
};

// August 9, 2021, 8:23:15 AM
export const formatDateTimeWithSeconds = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const timeZone = resolveTimeZone(locale.time_zone, config.time_zone);
  const zonedDate = toTimeZone(dateObj, timeZone);
  const isAmPm = useAmPm(locale);
  const pattern = formatForDatePreference(
    {
      DMY: `d MMMM, yyyy 'at' ${isAmPm ? "h:mm:ss a" : "HH:mm:ss"}`,
      MDY: `MMMM d, yyyy 'at' ${isAmPm ? "h:mm:ss a" : "HH:mm:ss"}`,
      YMD: `yyyy, MMMM d 'at' ${isAmPm ? "h:mm:ss a" : "HH:mm:ss"}`,
    },
    locale
  );
  return format(zonedDate, pattern);
};

// 9/8/2021, 8:23 AM
export const formatDateTimeNumeric = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) =>
  `${formatDateNumeric(dateObj, locale, config)}, ${formatTime(
    dateObj,
    locale,
    config
  )}`;
