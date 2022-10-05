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
    const intLocale = new Intl.Locale(locale.language);
    if ("weekInfo" in intLocale) {
      // @ts-ignore
      return intLocale.weekInfo.firstDay % 7;
    }
    return getWeekStartByLocale(locale.language) % 7;
  }
  return weekdays.indexOf(locale.first_weekday);
};

export const firstWeekday = (locale: FrontendLocaleData) => {
  const index = firstWeekdayIndex(locale);
  return weekdays[index];
};
