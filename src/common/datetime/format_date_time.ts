import type { HassConfig } from "home-assistant-js-websocket";
import memoizeOne from "memoize-one";
import { DateFormat, type FrontendLocaleData } from "../../data/translation";
import { formatDateNumeric } from "./format_date";
import { formatTime } from "./format_time";
import { resolveTimeZone } from "./resolve-time-zone";
import { useAmPm } from "./use_am_pm";

// August 9, 2021, 8:23 AM
export const formatDateTime = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const formatter = formatDateTimeMem(locale, config.time_zone);

  if (
    locale.date_format === DateFormat.language ||
    locale.date_format === DateFormat.system
  ) {
    return formatter.format(dateObj);
  }

  const parts = formatter.formatToParts(dateObj);
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  const formats = {
    [DateFormat.DMY]: `${day} ${month}, ${year}, ${hour}:${minute}`,
    [DateFormat.MDY]: `${month} ${day}, ${year}, ${hour}:${minute}`,
    [DateFormat.YMD]: `${year}, ${month} ${day}, ${hour}:${minute}`,
  };

  return formats[locale.date_format];
};

const formatDateTimeMem = memoizeOne(
  (locale: FrontendLocaleData, serverTimeZone: string) =>
    new Intl.DateTimeFormat(locale.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: useAmPm(locale) ? "numeric" : "2-digit",
      minute: "2-digit",
      hourCycle: useAmPm(locale) ? "h12" : "h23",
      timeZone: resolveTimeZone(locale.time_zone, serverTimeZone),
    })
);

export const formatDateTimeWithBrowserDefaults = (dateObj: Date) =>
  formatDateTimeWithBrowserDefaultsMem().format(dateObj);

const formatDateTimeWithBrowserDefaultsMem = memoizeOne(
  () =>
    new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
);

// Aug 9, 2021, 8:23 AM
export const formatShortDateTimeWithYear = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const formatter = formatShortDateTimeWithYearMem(locale, config.time_zone);

  if (
    locale.date_format === DateFormat.language ||
    locale.date_format === DateFormat.system
  ) {
    return formatter.format(dateObj);
  }

  const parts = formatter.formatToParts(dateObj);
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  const formats = {
    [DateFormat.DMY]: `${day} ${month}, ${year}, ${hour}:${minute}`,
    [DateFormat.MDY]: `${month} ${day}, ${year}, ${hour}:${minute}`,
    [DateFormat.YMD]: `${year}, ${month} ${day}, ${hour}:${minute}`,
  };

  return formats[locale.date_format];
};

const formatShortDateTimeWithYearMem = memoizeOne(
  (locale: FrontendLocaleData, serverTimeZone: string) =>
    new Intl.DateTimeFormat(locale.language, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: useAmPm(locale) ? "numeric" : "2-digit",
      minute: "2-digit",
      hourCycle: useAmPm(locale) ? "h12" : "h23",
      timeZone: resolveTimeZone(locale.time_zone, serverTimeZone),
    })
);

// Aug 9, 8:23 AM
export const formatShortDateTime = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const formatter = formatShortDateTimeMem(locale, config.time_zone);

  if (
    locale.date_format === DateFormat.language ||
    locale.date_format === DateFormat.system
  ) {
    return formatter.format(dateObj);
  }

  const parts = formatter.formatToParts(dateObj);
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  const formats = {
    [DateFormat.DMY]: `${day} ${month}, ${hour}:${minute}`,
    [DateFormat.MDY]: `${month} ${day}, ${hour}:${minute}`,
    [DateFormat.YMD]: `${month} ${day}, ${hour}:${minute}`,
  };

  return formats[locale.date_format];
};

const formatShortDateTimeMem = memoizeOne(
  (locale: FrontendLocaleData, serverTimeZone: string) =>
    new Intl.DateTimeFormat(locale.language, {
      month: "short",
      day: "numeric",
      hour: useAmPm(locale) ? "numeric" : "2-digit",
      minute: "2-digit",
      hourCycle: useAmPm(locale) ? "h12" : "h23",
      timeZone: resolveTimeZone(locale.time_zone, serverTimeZone),
    })
);

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
  const formatter = formatDateTimeWithSecondsMem(locale, config.time_zone);

  if (
    locale.date_format === DateFormat.language ||
    locale.date_format === DateFormat.system
  ) {
    return formatter.format(dateObj);
  }

  const parts = formatter.formatToParts(dateObj);
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  const second = parts.find((part) => part.type === "second")?.value;

  const formats = {
    [DateFormat.DMY]: `${day} ${month}, ${year}, ${hour}:${minute}:${second}`,
    [DateFormat.MDY]: `${month} ${day}, ${year}, ${hour}:${minute}:${second}`,
    [DateFormat.YMD]: `${year}, ${month} ${day}, ${hour}:${minute}:${second}`,
  };

  return formats[locale.date_format];
};

const formatDateTimeWithSecondsMem = memoizeOne(
  (locale: FrontendLocaleData, serverTimeZone: string) =>
    new Intl.DateTimeFormat(locale.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: useAmPm(locale) ? "numeric" : "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: useAmPm(locale) ? "h12" : "h23",
      timeZone: resolveTimeZone(locale.time_zone, serverTimeZone),
    })
);

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
