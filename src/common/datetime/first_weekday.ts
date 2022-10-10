import { getWeekStartByLocale } from "weekstart";
import { FrontendLocaleData, FirstWeekday } from "../../data/translation";

export const weekdays = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export const firstWeekdayIndex = (locale: FrontendLocaleData): number => {
  if (locale.first_weekday === FirstWeekday.language) {
    // @ts-ignore
    if ("weekInfo" in Intl.Locale.prototype) {
      // @ts-ignore
      return new Intl.Locale(locale.language).weekInfo.firstDay % 7;
    }
    return getWeekStartByLocale(locale.language) % 7;
  }
  return weekdays.indexOf(locale.first_weekday);
};

export const firstWeekday = (locale: FrontendLocaleData) => {
  const index = firstWeekdayIndex(locale);
  return weekdays[index];
};
