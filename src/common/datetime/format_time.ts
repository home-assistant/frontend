import { format } from "fecha";
import { FrontendTranslationData } from "../../data/translation";
import { toLocaleTimeStringSupportsOptions } from "./check_options_support";

export const formatTime = toLocaleTimeStringSupportsOptions
  ? (dateObj: Date, locales: FrontendTranslationData) =>
      dateObj.toLocaleTimeString(locales.language, {
        hour: "numeric",
        minute: "2-digit",
      })
  : (dateObj: Date) => format(dateObj, "shortTime");

export const formatTimeWithSeconds = toLocaleTimeStringSupportsOptions
  ? (dateObj: Date, locales: FrontendTranslationData) =>
      dateObj.toLocaleTimeString(locales.language, {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
  : (dateObj: Date) => format(dateObj, "mediumTime");

export const formatTimeWeekday = toLocaleTimeStringSupportsOptions
  ? (dateObj: Date, locales: string) =>
      dateObj.toLocaleTimeString(locales, {
        weekday: "long",
        hour: "numeric",
        minute: "2-digit",
      })
  : (dateObj: Date) => format(dateObj, "dddd, HH:mm");
