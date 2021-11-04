import memoizeOne from "memoize-one";
import { FrontendLocaleData } from "../../data/translation";
import { polyfillsLoaded } from "../translations/localize";

if (__BUILD__ === "latest" && polyfillsLoaded) {
  await polyfillsLoaded;
}

// Tuesday, August 10
export const formatDateWeekday = (dateObj: Date, locale: FrontendLocaleData) =>
  formatDateWeekdayMem(locale).format(dateObj);

const formatDateWeekdayMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
);

// August 10, 2021
export const formatDate = (dateObj: Date, locale: FrontendLocaleData) =>
  formatDateMem(locale).format(dateObj);

const formatDateMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
);

// 10/08/2021
export const formatDateNumeric = (dateObj: Date, locale: FrontendLocaleData) =>
  formatDateNumericMem(locale).format(dateObj);

const formatDateNumericMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    })
);

// Aug 10
export const formatDateShort = (dateObj: Date, locale: FrontendLocaleData) =>
  formatDateShortMem(locale).format(dateObj);

const formatDateShortMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      day: "numeric",
      month: "short",
    })
);

// August 2021
export const formatDateMonthYear = (
  dateObj: Date,
  locale: FrontendLocaleData
) => formatDateMonthYearMem(locale).format(dateObj);

const formatDateMonthYearMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      month: "long",
      year: "numeric",
    })
);

// August
export const formatDateMonth = (dateObj: Date, locale: FrontendLocaleData) =>
  formatDateMonthMem(locale).format(dateObj);

const formatDateMonthMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      month: "long",
    })
);

// 2021
export const formatDateYear = (dateObj: Date, locale: FrontendLocaleData) =>
  formatDateYearMem(locale).format(dateObj);

const formatDateYearMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      year: "numeric",
    })
);
