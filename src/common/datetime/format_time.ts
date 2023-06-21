import { HassConfig } from "home-assistant-js-websocket";
import memoizeOne from "memoize-one";
import { FrontendLocaleData } from "../../data/translation";
import "../../resources/intl-polyfill";
import { useAmPm } from "./use_am_pm";

// 9:15 PM || 21:15
export const formatTime = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => formatTimeMem(locale, config.time_zone).format(dateObj);

const formatTimeMem = memoizeOne(
  (locale: FrontendLocaleData, serverTimeZone: string) =>
    new Intl.DateTimeFormat(locale.language, {
      hour: "numeric",
      minute: "2-digit",
      hourCycle: useAmPm(locale) ? "h12" : "h23",
      timeZone: locale.time_zone === "server" ? serverTimeZone : undefined,
    })
);

// 9:15:24 PM || 21:15:24
export const formatTimeWithSeconds = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => formatTimeWithSecondsMem(locale, config.time_zone).format(dateObj);

const formatTimeWithSecondsMem = memoizeOne(
  (locale: FrontendLocaleData, serverTimeZone: string) =>
    new Intl.DateTimeFormat(locale.language, {
      hour: useAmPm(locale) ? "numeric" : "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: useAmPm(locale) ? "h12" : "h23",
      timeZone: locale.time_zone === "server" ? serverTimeZone : undefined,
    })
);

// Tuesday 7:00 PM || Tuesday 19:00
export const formatTimeWeekday = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => formatTimeWeekdayMem(locale, config.time_zone).format(dateObj);

const formatTimeWeekdayMem = memoizeOne(
  (locale: FrontendLocaleData, serverTimeZone: string) =>
    new Intl.DateTimeFormat(locale.language, {
      weekday: "long",
      hour: useAmPm(locale) ? "numeric" : "2-digit",
      minute: "2-digit",
      hourCycle: useAmPm(locale) ? "h12" : "h23",
      timeZone: locale.time_zone === "server" ? serverTimeZone : undefined,
    })
);

// 21:15
export const formatTime24h = (
  dateObj: Date,
  locale: FrontendLocaleData,
  config: HassConfig
) => formatTime24hMem(locale, config.time_zone).format(dateObj);

const formatTime24hMem = memoizeOne(
  (locale: FrontendLocaleData, serverTimeZone: string) =>
    // en-GB to fix Chrome 24:59 to 0:59 https://stackoverflow.com/a/60898146
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
      timeZone: locale.time_zone === "server" ? serverTimeZone : undefined,
    })
);
