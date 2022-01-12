import { selectUnit } from "@formatjs/intl-utils";
import memoizeOne from "memoize-one";
import { FrontendLocaleData } from "../../data/translation";
import { polyfillsLoaded } from "../translations/localize";

if (__BUILD__ === "latest" && polyfillsLoaded) {
  await polyfillsLoaded;
}

const formatRelTimeMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    // @ts-expect-error
    new Intl.RelativeTimeFormat(locale.language, { numeric: "auto" })
);

export const relativeTime = (
  from: Date,
  locale: FrontendLocaleData,
  to?: Date,
  includeTense = true
): string => {
  const diff = selectUnit(from, to);
  if (includeTense) {
    return formatRelTimeMem(locale).format(diff.value, diff.unit);
  }
  return Intl.NumberFormat(locale.language, {
    style: "unit",
    // @ts-expect-error
    unit: diff.unit,
    unitDisplay: "long",
  }).format(Math.abs(diff.value));
};
