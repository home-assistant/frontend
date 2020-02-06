import fecha from "fecha";
import { toLocaleTimeStringSupportsOptions } from "./check_options_support";

export const formatTime = toLocaleTimeStringSupportsOptions
  ? (dateObj: Date, locales: string) =>
      dateObj.toLocaleTimeString(locales, {
        hour: "numeric",
        minute: "2-digit",
      })
  : (dateObj: Date) => fecha.format(dateObj, "shortTime");

export const formatTimeWithSeconds = toLocaleTimeStringSupportsOptions
  ? (dateObj: Date, locales: string) =>
      dateObj.toLocaleTimeString(locales, {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
  : (dateObj: Date) => fecha.format(dateObj, "mediumTime");
