import memoizeOne from "memoize-one";
import { FrontendLocaleData } from "../../data/translation";
import { selectUnit } from "../util/select-unit";

export type TimeVerbosity = "narrow" | "short" | "long";

const formatRelTimeMem = memoizeOne(
  (locale: FrontendLocaleData, timeVerbosity: TimeVerbosity) =>
    new Intl.RelativeTimeFormat(locale.language, {
      numeric: "auto",
      style: timeVerbosity,
    })
);

export const relativeTime = (
  from: Date,
  locale: FrontendLocaleData,
  to?: Date,
  includeTense = true,
  timeVerbosity: TimeVerbosity = "long"
): string => {
  const diff = selectUnit(from, to, locale);
  if (includeTense) {
    return formatRelTimeMem(locale, timeVerbosity).format(
      diff.value,
      diff.unit
    );
  }
  return Intl.NumberFormat(locale.language, {
    style: "unit",
    unit: diff.unit,
    unitDisplay: timeVerbosity,
  }).format(Math.abs(diff.value));
};
