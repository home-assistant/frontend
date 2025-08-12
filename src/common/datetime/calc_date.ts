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
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import type { HassConfig } from "home-assistant-js-websocket";
import type { FrontendLocaleData } from "../../data/translation";
import { TimeZone } from "../../data/translation";

const calcZonedDate = (
  date: Date,
  tz: string,
  fn: (date: Date, options?: any) => Date | number | boolean,
  options?
) => {
  const inputZoned = toZonedTime(date, tz);
  const fnZoned = fn(inputZoned, options);
  if (fnZoned instanceof Date) {
    return fromZonedTime(fnZoned, tz) as Date;
  }
  return fnZoned;
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
      ? toZonedTime(startDate, config.time_zone)
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
