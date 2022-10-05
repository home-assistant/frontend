import { FrontendLocaleData } from "../../data/translation";

export const weekdays = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const useFirstWeekdayIndex = (locale: FrontendLocaleData): number =>
  weekdays.indexOf(locale.first_weekday);
