import { format } from "fecha";
import { FrontendLocaleData } from "../../data/translation";
import { toLocaleStringSupportsOptions } from "./check_options_support";
import { useAmPm } from "./use_am_pm";

export const formatDateTime = toLocaleStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      dateObj.toLocaleString(locale.language, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: useAmPm(locale),
      })
  : (dateObj: Date, locale: FrontendLocaleData) =>
      format(dateObj, "MMMM D, YYYY, HH:mm" + useAmPm(locale) ? " A" : "");

export const formatDateTimeWithSeconds = toLocaleStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      dateObj.toLocaleString(locale.language, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: useAmPm(locale),
      })
  : (dateObj: Date, locale: FrontendLocaleData) =>
      format(dateObj, "MMMM D, YYYY, HH:mm:ss" + useAmPm(locale) ? " A" : "");
