import { format } from "fecha";
import memoizeOne from "memoize-one";
import { FrontendLocaleData } from "../../data/translation";
import { toLocaleDateStringSupportsOptions } from "./check_options_support";

// Tuesday, August 10
export const formatDateWeekday = toLocaleDateStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      formatDateWeekdayMem(locale).format(dateObj)
  : (dateObj: Date) => format(dateObj, "dddd, MMMM D");
const formatDateWeekdayMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
);

// August 10, 2021
export const formatDate = toLocaleDateStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      formatDateMem(locale).format(dateObj)
  : (dateObj: Date) => format(dateObj, "MMMM D, YYYY");
const formatDateMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
);

// 10/08/2021
export const formatDateNumeric = toLocaleDateStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      formatDateNumericMem(locale).format(dateObj)
  : (dateObj: Date) => format(dateObj, "M/D/YYYY");
const formatDateNumericMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    })
);

// Aug 10
export const formatDateShort = toLocaleDateStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      formatDateShortMem(locale).format(dateObj)
  : (dateObj: Date) => format(dateObj, "MMM D");
const formatDateShortMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      day: "numeric",
      month: "short",
    })
);

// August 2021
export const formatDateMonthYear = toLocaleDateStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      formatDateMonthYearMem(locale).format(dateObj)
  : (dateObj: Date) => format(dateObj, "MMMM YYYY");
const formatDateMonthYearMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      month: "long",
      year: "numeric",
    })
);

// August
export const formatDateMonth = toLocaleDateStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      formatDateMonthMem(locale).format(dateObj)
  : (dateObj: Date) => format(dateObj, "MMMM");
const formatDateMonthMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      month: "long",
    })
);

// 2021
export const formatDateYear = toLocaleDateStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      formatDateYearMem(locale).format(dateObj)
  : (dateObj: Date) => format(dateObj, "YYYY");
const formatDateYearMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      year: "numeric",
    })
);
