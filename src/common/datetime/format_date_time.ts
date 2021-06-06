import { format } from "fecha";
import memoizeOne from "memoize-one";
import { FrontendLocaleData } from "../../data/translation";
import { toLocaleStringSupportsOptions } from "./check_options_support";
import { useAmPm } from "./use_am_pm";

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

export const formatDateTime = toLocaleStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      formatDateTimeMem(locale).format(dateObj)
  : (dateObj: Date, locale: FrontendLocaleData) =>
      format(dateObj, "MMMM D, YYYY, HH:mm" + useAmPm(locale) ? " A" : "");

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

export const formatDateTimeWithSeconds = toLocaleStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      formatDateTimeWithSecondsMem(locale).format(dateObj)
  : (dateObj: Date, locale: FrontendLocaleData) =>
      format(dateObj, "MMMM D, YYYY, HH:mm:ss" + useAmPm(locale) ? " A" : "");
