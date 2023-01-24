import memoizeOne from "memoize-one";
import { FrontendLocaleData } from "../../data/translation";
import { polyfillsLoaded } from "../translations/localize";
import { selectUnit } from "../util/select-unit";

if (__BUILD__ === "latest" && polyfillsLoaded) {
  await polyfillsLoaded;
}

const formatRelTimeMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.RelativeTimeFormat(locale.language, { numeric: "auto" })
);

export const relativeTime = (
  from: Date,
  locale: FrontendLocaleData,
  to?: Date,
  includeTense = true
): string => {
  const diff = selectUnit(from, to, locale);
  if (includeTense) {
    return formatRelTimeMem(locale).format(diff.value, diff.unit);
  }
  return Intl.NumberFormat(locale.language, {
    style: "unit",
    unit: diff.unit,
    unitDisplay: "long",
  }).format(Math.abs(diff.value));
};
