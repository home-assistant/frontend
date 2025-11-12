import { getWeekStartByLocale } from "weekstart";
import type { FrontendLocaleData } from "../../data/translation";
import { FirstWeekday } from "../../data/translation";
import { WEEKDAYS_LONG, type WeekdayIndex } from "./weekday";

export const firstWeekdayIndex = (locale: FrontendLocaleData): WeekdayIndex => {
  if (locale.first_weekday === FirstWeekday.language) {
    // @ts-ignore
    if ("weekInfo" in Intl.Locale.prototype) {
      // @ts-ignore
      return new Intl.Locale(locale.language).weekInfo.firstDay % 7;
    }
    return (getWeekStartByLocale(locale.language) % 7) as WeekdayIndex;
  }
  return WEEKDAYS_LONG.includes(locale.first_weekday)
    ? (WEEKDAYS_LONG.indexOf(locale.first_weekday) as WeekdayIndex)
    : 1;
};

export const firstWeekday = (locale: FrontendLocaleData) => {
  const index = firstWeekdayIndex(locale);
  return WEEKDAYS_LONG[index];
};
