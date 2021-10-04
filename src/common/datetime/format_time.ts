import memoizeOne from "memoize-one";
import { FrontendLocaleData } from "../../data/translation";
import { useAmPm } from "./use_am_pm";
import { polyfillsLoaded } from "../translations/localize";

if (__BUILD__ === "latest" && polyfillsLoaded) {
  await polyfillsLoaded;
}

// 9:15 PM || 21:15
export const formatTime = (dateObj: Date, locale: FrontendLocaleData) =>
  formatTimeMem(locale).format(dateObj);

const formatTimeMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      hour: "numeric",
      minute: "2-digit",
      hour12: useAmPm(locale),
    })
);

// 9:15:24 PM || 21:15:24
export const formatTimeWithSeconds = (
  dateObj: Date,
  locale: FrontendLocaleData
) => formatTimeWithSecondsMem(locale).format(dateObj);

const formatTimeWithSecondsMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      hour: useAmPm(locale) ? "numeric" : "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: useAmPm(locale),
    })
);

// Tuesday 7:00 PM || Tuesday 19:00
export const formatTimeWeekday = (dateObj: Date, locale: FrontendLocaleData) =>
  formatTimeWeekdayMem(locale).format(dateObj);

const formatTimeWeekdayMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      hour: useAmPm(locale) ? "numeric" : "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: useAmPm(locale),
    })
);
