import { format } from "fecha";
import { FrontendLocaleData } from "../../data/translation";
import { toLocaleTimeStringSupportsOptions } from "./check_options_support";
import { useAmPm } from "./use_am_pm";

export const formatTime = toLocaleTimeStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      dateObj.toLocaleTimeString(locale.language, {
        hour: "numeric",
        minute: "2-digit",
        hour12: useAmPm(locale),
      })
  : (dateObj: Date, locale: FrontendLocaleData) =>
      format(dateObj, "shortTime" + useAmPm(locale) ? " A" : "");

export const formatTimeWithSeconds = toLocaleTimeStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      dateObj.toLocaleTimeString(locale.language, {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: useAmPm(locale),
      })
  : (dateObj: Date, locale: FrontendLocaleData) =>
      format(dateObj, "mediumTime" + useAmPm(locale) ? " A" : "");

export const formatTimeWeekday = toLocaleTimeStringSupportsOptions
  ? (dateObj: Date, locale: FrontendLocaleData) =>
      dateObj.toLocaleTimeString(locale.language, {
        weekday: "long",
        hour: "numeric",
        minute: "2-digit",
        hour12: useAmPm(locale),
      })
  : (dateObj: Date, locale: FrontendLocaleData) =>
      format(dateObj, "dddd, HH:mm" + useAmPm(locale) ? " A" : "");
