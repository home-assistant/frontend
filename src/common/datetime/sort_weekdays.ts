import type { FrontendLocaleData } from "../../data/translation";
import { firstWeekdayIndex } from "./first_weekday";
import { WEEKDAYS_SHORT, type WeekdayShort } from "./weekday";

export const weekdaysFromFirst = (
  locale: FrontendLocaleData
): WeekdayShort[] => {
  const index = firstWeekdayIndex(locale);
  return [...WEEKDAYS_SHORT.slice(index), ...WEEKDAYS_SHORT.slice(0, index)];
};

export const sortWeekdays = <T extends string>(
  locale: FrontendLocaleData,
  days: readonly T[]
): T[] => {
  const order: readonly string[] = weekdaysFromFirst(locale);
  // Unknown values keep their relative order after the known weekdays
  const position = (day: string) => {
    const index = order.indexOf(day);
    return index === -1 ? order.length : index;
  };
  return [...days].sort((a, b) => position(a) - position(b));
};
