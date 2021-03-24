import { format } from "fecha";
import { FrontendTranslationData } from "../../data/translation";
import { toLocaleDateStringSupportsOptions } from "./check_options_support";

export const formatDate = toLocaleDateStringSupportsOptions
  ? (dateObj: Date, locales: FrontendTranslationData) =>
      dateObj.toLocaleDateString(locales.language, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
  : (dateObj: Date) => format(dateObj, "longDate");

export const formatDateWeekday = toLocaleDateStringSupportsOptions
  ? (dateObj: Date, locales: FrontendTranslationData) =>
      dateObj.toLocaleDateString(locales.language, {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
  : (dateObj: Date) => format(dateObj, "dddd, MMM D");
