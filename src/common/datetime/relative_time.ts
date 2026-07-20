import memoizeOne from "memoize-one";
import type { FrontendLocaleData } from "../../data/translation";
import { selectUnit } from "../util/select-unit";

const formatRelTimeMem = memoizeOne(
  (locale: FrontendLocaleData, style: Intl.RelativeTimeFormatStyle) =>
    new Intl.RelativeTimeFormat(locale.language, { numeric: "auto", style })
);

export const relativeTime = (
  from: Date,
  locale: FrontendLocaleData,
  to?: Date,
  includeTense = true,
  style: Intl.RelativeTimeFormatStyle = "long"
): string => {
  const diff = selectUnit(from, to, locale);
  if (includeTense) {
    return formatRelTimeMem(locale, style).format(diff.value, diff.unit);
  }
  return Intl.NumberFormat(locale.language, {
    style: "unit",
    unit: diff.unit,
    unitDisplay: style,
  }).format(Math.abs(diff.value));
};
