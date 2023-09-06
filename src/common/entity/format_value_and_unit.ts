import { FrontendLocaleData } from "../../data/translation";
import { blankBeforePercent } from "../translations/blank_before_percent";

export const formatValueAndUnit = (
  locale: FrontendLocaleData,
  value: any,
  unit?: any
): string => {
  if (!unit) {
    return value;
  }

  if (unit === "%") {
    return `${value}${blankBeforePercent(locale)}${unit}`;
  }

  if (unit === "°") {
    return `${value}${unit}`;
  }

  if (unit) {
    return `${value} ${unit}`;
  }

  return value;
};
