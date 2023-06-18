import { utcToZonedTime, zonedTimeToUtc } from "date-fns-tz";
import { HassConfig } from "home-assistant-js-websocket";
import { FrontendLocaleData, TimeZone } from "../../data/translation";

const calcZonedDate = (
  date: Date,
  tz: string,
  fn: (date: Date, options?: any) => Date,
  options?
) => {
  const inputZoned = utcToZonedTime(date, tz);
  const fnZoned = fn(inputZoned, options);
  return zonedTimeToUtc(fnZoned, tz);
};

export const calcDate = (
  date: Date,
  fn: (date: Date, options?: any) => Date,
  locale: FrontendLocaleData,
  config: HassConfig,
  options?
) =>
  locale.time_zone === TimeZone.server
    ? calcZonedDate(date, config.time_zone, fn, options)
    : fn(date, options);
