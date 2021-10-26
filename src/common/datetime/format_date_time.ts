import memoizeOne from "memoize-one";
import { FrontendLocaleData } from "../../data/translation";
import { useAmPm } from "./use_am_pm";
import { polyfillsLoaded } from "../translations/localize";

if (__BUILD__ === "latest" && polyfillsLoaded) {
  await polyfillsLoaded;
}

// August 9, 2021, 8:23 AM
export const formatDateTime = (dateObj: Date, locale: FrontendLocaleData) =>
  formatDateTimeMem(locale).format(dateObj);

const formatDateTimeMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: useAmPm(locale) ? "numeric" : "2-digit",
      minute: "2-digit",
      hour12: useAmPm(locale),
    })
);

// August 9, 2021, 8:23:15 AM
export const formatDateTimeWithSeconds = (
  dateObj: Date,
  locale: FrontendLocaleData
) => formatDateTimeWithSecondsMem(locale).format(dateObj);

const formatDateTimeWithSecondsMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: useAmPm(locale) ? "numeric" : "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: useAmPm(locale),
    })
);

// 9/8/2021, 8:23 AM
export const formatDateTimeNumeric = (
  dateObj: Date,
  locale: FrontendLocaleData
) => formatDateTimeNumericMem(locale).format(dateObj);

const formatDateTimeNumericMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: useAmPm(locale),
    })
);
