import { format } from "fecha";
import memoizeOne from "memoize-one";
import { FrontendLocaleData } from "../../data/translation";
import { toLocaleTimeStringSupportsOptions } from "./check_options_support";
import { useAmPm } from "./use_am_pm";

// 9:15 PM || 21:15
export const formatTime = toLocaleTimeStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      formatTimeMem(locale).format(dateObj)
  : (dateObj: Date, locale: FrontendLocaleData) =>
      format(dateObj, "shortTime" + useAmPm(locale) ? " A" : "");
const formatTimeMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      hour: "numeric",
      minute: "2-digit",
      hour12: useAmPm(locale),
    })
);

// 9:15:24 PM || 21:15:24
export const formatTimeWithSeconds = toLocaleTimeStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      formatTimeWithSecondsMem(locale).format(dateObj)
  : (dateObj: Date, locale: FrontendLocaleData) =>
      format(dateObj, "mediumTime" + useAmPm(locale) ? " A" : "");
const formatTimeWithSecondsMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: useAmPm(locale),
    })
);

// Tuesday 7:00 PM || Tuesday 19:00
export const formatTimeWeekday = toLocaleTimeStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      formatTimeWeekdayMem(locale).format(dateObj)
  : (dateObj: Date, locale: FrontendLocaleData) =>
      format(dateObj, "dddd, HH:mm" + useAmPm(locale) ? " A" : "");
const formatTimeWeekdayMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
      hour12: useAmPm(locale),
    })
);
