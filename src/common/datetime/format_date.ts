import { format } from "fecha";
import memoizeOne from "memoize-one";
import { FrontendLocaleData } from "../../data/translation";
import { toLocaleDateStringSupportsOptions } from "./check_options_support";

const formatDateMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
);

export const formatDate = toLocaleDateStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      formatDateMem(locale).format(dateObj)
  : (dateObj: Date) => format(dateObj, "longDate");

const formatDateShortMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      day: "numeric",
      month: "short",
    })
);

export const formatDateShort = toLocaleDateStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      formatDateShortMem(locale).format(dateObj)
  : (dateObj: Date) => format(dateObj, "shortDate");

const formatDateWeekdayMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
);

export const formatDateWeekday = toLocaleDateStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      formatDateWeekdayMem(locale).format(dateObj)
  : (dateObj: Date) => format(dateObj, "dddd, MMM D");
