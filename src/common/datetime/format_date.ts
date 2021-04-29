import { format } from "fecha";
import { FrontendLocaleData } from "../../data/translation";
import { toLocaleDateStringSupportsOptions } from "./check_options_support";

export const formatDate = toLocaleDateStringSupportsOptions
  ? (dateObj: Date, locale: Partial<FrontendLocaleData>) =>
      dateObj.toLocaleDateString(locale.language, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
  : (dateObj: Date) => format(dateObj, "longDate");

export const formatDateWeekday = toLocaleDateStringSupportsOptions
  ? (dateObj: Date, locale: Partial<FrontendLocaleData>) =>
      dateObj.toLocaleDateString(locale.language, {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
  : (dateObj: Date) => format(dateObj, "dddd, MMM D");
