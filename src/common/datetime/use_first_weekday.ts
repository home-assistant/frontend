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

export const useFirstWeekdayIndex = (locale: FrontendLocaleData): number => {
  if (locale.first_weekday === FirstWeekday.language) {
    if ("weekInfo" in Intl.Locale.prototype) {
      // @ts-ignore
      return new Intl.Locale(locale.language).weekInfo.firstDay % 7;
    }
    return getWeekStartByLocale(locale.language) % 7;
  }
  return weekdays.indexOf(locale.first_weekday);
};

export const useFirstWeekday = (locale: FrontendLocaleData) => {
  const index = useFirstWeekdayIndex(locale);
  return weekdays[index];
};
