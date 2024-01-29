import { utcToZonedTime, zonedTimeToUtc } from "date-fns-tz";
import { HassConfig } from "home-assistant-js-websocket";
import { FrontendLocaleData, TimeZone } from "../../data/translation";

const calcZonedDate = (
  date: Date,
  tz: string,
  fn: (date: Date, options?: any) => Date | number | boolean,
  options?
) => {
  const inputZoned = utcToZonedTime(date, tz);
  const fnZoned = fn(inputZoned, options);
  if (fnZoned instanceof Date) {
    return zonedTimeToUtc(fnZoned, tz) as Date;
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
