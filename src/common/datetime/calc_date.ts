import {
  addMilliseconds,
  addMonths,
  isFirstDayOfMonth,
  isLastDayOfMonth,
  differenceInMilliseconds,
  differenceInMonths,
  endOfMonth,
  startOfDay,
  endOfDay,
  differenceInDays,
  addDays,
} from "date-fns";
import { TZDate } from "@date-fns/tz";
import type { HassConfig } from "home-assistant-js-websocket";
import type { FrontendLocaleData } from "../../data/translation";
import { TimeZone } from "../../data/translation";
import { LOCAL_TIME_ZONE } from "./resolve-time-zone";

const calcZonedDate = (
  date: Date,
  tz: string,
  fn: (date: Date, options?: any) => Date | number | boolean,
  options?
) => {
  const tzDate = new TZDate(date, tz);
  const fnResult = fn(tzDate, options);
  if (fnResult instanceof Date) {
    // Convert back to regular Date in the specified timezone
    return new Date(fnResult.getTime());
  }
  return fnResult;
};

export const calcDate = (
  date: Date,
  fn: (date: Date, options?: any) => Date,
  locale: FrontendLocaleData,
  config: HassConfig,
  options?
) =>
  locale.time_zone === TimeZone.server
    ? (calcZonedDate(date, config.time_zone, fn, options) as Date)
    : fn(date, options);

/**
 * Moves a date calculated in the browser time zone to the same date and time
 * in the server time zone.
 */
export const shiftToServerTimeZone = (
  date: Date,
  locale: FrontendLocaleData,
  config: HassConfig
): Date => {
  if (
    locale.time_zone === TimeZone.server ||
    LOCAL_TIME_ZONE === config.time_zone
  ) {
    return date;
  }
  const shifted = new TZDate(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
    config.time_zone
  ).getTime();
  // TZDate is invalid where Intl lacks "longOffset" (Chrome < 95, Safari < 15.4)
  return Number.isNaN(shifted) ? date : new Date(shifted);
};

export const calcDateProperty = (
  date: Date,
  fn: (date: Date, options?: any) => boolean | number,
  locale: FrontendLocaleData,
  config: HassConfig,
  options?
) =>
  locale.time_zone === TimeZone.server
    ? (calcZonedDate(date, config.time_zone, fn, options) as number | boolean)
    : fn(date, options);

export const calcDateDifferenceProperty = (
  endDate: Date,
  startDate: Date,
  fn: (date: Date, options?: any) => boolean | number,
  locale: FrontendLocaleData,
  config: HassConfig
) =>
  calcDateProperty(
    endDate,
    fn,
    locale,
    config,
    locale.time_zone === TimeZone.server
      ? new TZDate(startDate, config.time_zone)
      : startDate
  );

export const shiftDateRange = (
  startDate: Date,
  endDate: Date,
  forward: boolean,
  locale: FrontendLocaleData,
  config: any
): { start: Date; end: Date } => {
  let start: Date;
  let end: Date;
  if (
    (calcDateProperty(
      startDate,
      isFirstDayOfMonth,
      locale,
      config
    ) as boolean) &&
    (calcDateProperty(endDate, isLastDayOfMonth, locale, config) as boolean)
  ) {
    const difference =
      ((calcDateDifferenceProperty(
        endDate,
        startDate,
        differenceInMonths,
        locale,
        config
      ) as number) +
        1) *
      (forward ? 1 : -1);
    start = calcDate(startDate, addMonths, locale, config, difference);
    end = calcDate(
      calcDate(endDate, addMonths, locale, config, difference),
      endOfMonth,
      locale,
      config
    );
  } else if (
    calcDateProperty(
      startDate,
      (date) => startOfDay(date).getMilliseconds() === date.getMilliseconds(),
      locale,
      config
    ) &&
    calcDateProperty(
      endDate,
      (date) => endOfDay(date).getMilliseconds() === date.getMilliseconds(),
      locale,
      config
    )
  ) {
    const difference =
      ((calcDateDifferenceProperty(
        endDate,
        startDate,
        differenceInDays,
        locale,
        config
      ) as number) +
        1) *
      (forward ? 1 : -1);
    start = calcDate(startDate, addDays, locale, config, difference);
    end = calcDate(endDate, addDays, locale, config, difference);
  } else {
    const difference =
      (calcDateDifferenceProperty(
        endDate,
        startDate,
        differenceInMilliseconds,
        locale,
        config
      ) as number) * (forward ? 1 : -1);
    start = calcDate(startDate, addMilliseconds, locale, config, difference);
    end = calcDate(endDate, addMilliseconds, locale, config, difference);
  }
  return { start, end };
};

/**
 * @description Parses a date in browser display timezone
 * @param date - The date to parse
 * @param timezone - The timezone to parse the date in
 * @returns The parsed date as a Date object
 */
export const parseDate = (date: string, timezone: string): Date => {
  const tzDate = new TZDate(date, timezone);
  return new Date(tzDate.getTime());
};

/**
 * @description Formats a date in browser display timezone
 * @param date - The date to format
 * @param timezone - The timezone to format the date in
 * @returns The formatted date in YYYY-MM-DD format
 */
export const formatDate = (date: Date, timezone: string): string => {
  const tzDate = new TZDate(date, timezone);
  return tzDate.toISOString().split("T")[0];
};

/**
 * @description Formats a time in browser display timezone
 * @param date - The date to format
 * @param timezone - The timezone to format the time in
 * @returns The formatted time in HH:mm:ss format
 */
export const formatTime = (date: Date, timezone: string): string => {
  const tzDate = new TZDate(date, timezone);
  return tzDate.toISOString().split("T")[1].split(".")[0];
};
