import fecha from "fecha";
import { toLocaleStringSupportsOptions } from "./check_options_support";

export const formatDateTime = toLocaleStringSupportsOptions
  ? (dateObj: Date, locales: string) =>
      dateObj.toLocaleString(locales, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
  : (dateObj: Date) =>
      fecha.format(
        dateObj,
        `${fecha.masks.longDate}, ${fecha.masks.shortTime}`
      );

export const formatDateTimeWithSeconds = toLocaleStringSupportsOptions
  ? (dateObj: Date, locales: string) =>
      dateObj.toLocaleString(locales, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
  : (dateObj: Date) =>
      fecha.format(
        dateObj,
        `${fecha.masks.longDate}, ${fecha.masks.mediumTime}`
      );
