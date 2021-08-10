import { format } from "fecha";
import memoizeOne from "memoize-one";
import { FrontendLocaleData } from "../../data/translation";
import { toLocaleStringSupportsOptions } from "./check_options_support";
import { useAmPm } from "./use_am_pm";

// August 9, 2021, 8:23 AM
export const formatDateTime = toLocaleStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      formatDateTimeMem(locale).format(dateObj)
  : (dateObj: Date, locale: FrontendLocaleData) =>
      format(dateObj, "MMMM D, YYYY, HH:mm" + useAmPm(locale) ? " A" : "");
const formatDateTimeMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: useAmPm(locale),
    })
);

// August 9, 2021, 8:23:15 AM
export const formatDateTimeWithSeconds = toLocaleStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      formatDateTimeWithSecondsMem(locale).format(dateObj)
  : (dateObj: Date, locale: FrontendLocaleData) =>
      format(dateObj, "MMMM D, YYYY, HH:mm:ss" + useAmPm(locale) ? " A" : "");
const formatDateTimeWithSecondsMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: useAmPm(locale),
    })
);

// 9/8/2021, 8:23 AM
export const formatDateTimeNumeric = toLocaleStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      formatDateTimeNumericMem(locale).format(dateObj)
  : (dateObj: Date, locale: FrontendLocaleData) =>
      format(dateObj, "M/D/YYYY, HH:mm" + useAmPm(locale) ? " A" : "");
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
