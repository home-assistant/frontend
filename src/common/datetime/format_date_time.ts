import { format } from "fecha";
import { FrontendTranslationData } from "../../data/translation";
import { toLocaleStringSupportsOptions } from "./check_options_support";

export const formatDateTime = toLocaleStringSupportsOptions
  ? (dateObj: Date, locales: FrontendTranslationData) =>
      dateObj.toLocaleString(locales.language, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
  : (dateObj: Date) => format(dateObj, "MMMM D, YYYY, HH:mm");

export const formatDateTimeWithSeconds = toLocaleStringSupportsOptions
  ? (dateObj: Date, locales: FrontendTranslationData) =>
      dateObj.toLocaleString(locales.language, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
  : (dateObj: Date) => format(dateObj, "MMMM D, YYYY, HH:mm:ss");
