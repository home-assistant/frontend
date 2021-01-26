import { format } from "fecha";
import { toLocaleDateStringSupportsOptions } from "./check_options_support";

export const formatDate = toLocaleDateStringSupportsOptions
  ? (dateObj: Date, locales: string) =>
      dateObj.toLocaleDateString(locales, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
  : (dateObj: Date) => format(dateObj, "longDate");

export const formatDateWeekday = toLocaleDateStringSupportsOptions
  ? (dateObj: Date, locales: string) =>
      dateObj.toLocaleDateString(locales, {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
  : (dateObj: Date) => format(dateObj, "dddd, MMM D");
