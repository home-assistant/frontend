import memoizeOne from "memoize-one";
import { FrontendLocaleData } from "../../data/translation";
import { polyfillsLoaded } from "../translations/localize";
import { useAmPm } from "./use_am_pm";

if (__BUILD__ === "latest" && polyfillsLoaded) {
  await polyfillsLoaded;
}

// August 9, 2021, 8:23 AM
export const formatDateTime = (dateObj: Date, locale: FrontendLocaleData) =>
  formatDateTimeMem(locale).format(dateObj);

const formatDateTimeMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(
      locale.language === "en" && !useAmPm(locale)
        ? "en-u-hc-h23"
        : locale.language,
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: useAmPm(locale) ? "numeric" : "2-digit",
        minute: "2-digit",
        hour12: useAmPm(locale),
      }
    )
);

// Aug 9, 8:23 AM
export const formatShortDateTime = (
  dateObj: Date,
  locale: FrontendLocaleData
) => formatShortDateTimeMem(locale).format(dateObj);

const formatShortDateTimeMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(
      locale.language === "en" && !useAmPm(locale)
        ? "en-u-hc-h23"
        : locale.language,
      {
        month: "short",
        day: "numeric",
        hour: useAmPm(locale) ? "numeric" : "2-digit",
        minute: "2-digit",
        hour12: useAmPm(locale),
      }
    )
);

// August 9, 2021, 8:23:15 AM
export const formatDateTimeWithSeconds = (
  dateObj: Date,
  locale: FrontendLocaleData
) => formatDateTimeWithSecondsMem(locale).format(dateObj);

const formatDateTimeWithSecondsMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(
      locale.language === "en" && !useAmPm(locale)
        ? "en-u-hc-h23"
        : locale.language,
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: useAmPm(locale) ? "numeric" : "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: useAmPm(locale),
      }
    )
);

// 9/8/2021, 8:23 AM
export const formatDateTimeNumeric = (
  dateObj: Date,
  locale: FrontendLocaleData
) => formatDateTimeNumericMem(locale).format(dateObj);

const formatDateTimeNumericMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(
      locale.language === "en" && !useAmPm(locale)
        ? "en-u-hc-h23"
        : locale.language,
      {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: useAmPm(locale),
      }
    )
);
