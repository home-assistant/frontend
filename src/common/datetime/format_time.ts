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
    new Intl.DateTimeFormat(
      locale.language + (useAmPm(locale) ? "-u-hc-h12" : "-u-hc-h23"),
      {
        hour: "numeric",
        minute: "2-digit",
      }
    )
);

// 9:15:24 PM || 21:15:24
export const formatTimeWithSeconds = (
  dateObj: Date,
  locale: FrontendLocaleData
) => formatTimeWithSecondsMem(locale).format(dateObj);

const formatTimeWithSecondsMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(
      locale.language + (useAmPm(locale) ? "-u-hc-h12" : "-u-hc-h23"),
      {
        hour: useAmPm(locale) ? "numeric" : "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    )
);

// Tuesday 7:00 PM || Tuesday 19:00
export const formatTimeWeekday = (dateObj: Date, locale: FrontendLocaleData) =>
  formatTimeWeekdayMem(locale).format(dateObj);

const formatTimeWeekdayMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(
      locale.language + (useAmPm(locale) ? "-u-hc-h12" : "-u-hc-h23"),
      {
        hour: useAmPm(locale) ? "numeric" : "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    )
);
