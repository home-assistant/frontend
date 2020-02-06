import fecha from "fecha";
import { toLocaleDateStringSupportsOptions } from "./check_options_support";

export const formatDate = toLocaleDateStringSupportsOptions
  ? (dateObj: Date, locales: string) =>
      dateObj.toLocaleDateString(locales, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
  : (dateObj: Date) => fecha.format(dateObj, "longDate");
