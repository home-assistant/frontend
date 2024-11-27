import memoizeOne from "memoize-one";
import type { FrontendLocaleData } from "../../data/translation";
import { selectUnit } from "../util/select-unit";

export enum RelativeTimeFormat {
  relative = "long",
  relative_short = "short",
  relative_narrow = "narrow",
}

export type RelativeTimeStyle = `${RelativeTimeFormat}`;

export function isRelativeTimeFormat(
  format: string
): format is RelativeTimeFormat {
  return Object.keys(RelativeTimeFormat).includes(format as RelativeTimeFormat);
}

const formatRelTimeMem = memoizeOne(
  (locale: FrontendLocaleData, style: RelativeTimeStyle) =>
    new Intl.RelativeTimeFormat(locale.language, { numeric: "auto", style })
);

export const relativeTime = (
  from: Date,
  locale: FrontendLocaleData,
  to?: Date,
  includeTense = true,
  format = RelativeTimeFormat.relative
): string => {
  const diff = selectUnit(from, to, locale);
  const style = RelativeTimeFormat[format];
  if (includeTense) {
    return formatRelTimeMem(locale, style).format(diff.value, diff.unit);
  }
  return Intl.NumberFormat(locale.language, {
    style: "unit",
    unit: diff.unit,
    unitDisplay: style,
  }).format(Math.abs(diff.value));
};
