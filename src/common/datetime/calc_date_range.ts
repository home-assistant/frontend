import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subDays,
  subHours,
  subMonths,
} from "date-fns";
import type { HomeAssistant } from "../../types";
import { calcDate } from "./calc_date";
import { firstWeekdayIndex } from "./first_weekday";

export type DateRange =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "this_quarter"
  | "this_year"
  | "now-7d"
  | "now-30d"
  | "now-365d"
  | "now-12m"
  | "now-1h"
  | "now-12h"
  | "now-24h";

export const calcDateRange = (
  locale: HomeAssistant["locale"],
  hassConfig: HomeAssistant["config"],
  range: DateRange
): [Date, Date] => {
  const today = new Date();
  const weekStartsOn = firstWeekdayIndex(locale);
  switch (range) {
    case "today":
      return [
        calcDate(today, startOfDay, locale, hassConfig, {
          weekStartsOn,
        }),
        calcDate(today, endOfDay, locale, hassConfig, {
          weekStartsOn,
        }),
      ];
    case "yesterday":
      return [
        calcDate(addDays(today, -1), startOfDay, locale, hassConfig, {
          weekStartsOn,
        }),
        calcDate(addDays(today, -1), endOfDay, locale, hassConfig, {
          weekStartsOn,
        }),
      ];
    case "this_week":
      return [
        calcDate(today, startOfWeek, locale, hassConfig, {
          weekStartsOn,
        }),
        calcDate(today, endOfWeek, locale, hassConfig, {
          weekStartsOn,
        }),
      ];
    case "this_month":
      return [
        calcDate(today, startOfMonth, locale, hassConfig),
        calcDate(today, endOfMonth, locale, hassConfig),
      ];
    case "this_quarter":
      return [
        calcDate(today, startOfQuarter, locale, hassConfig),
        calcDate(today, endOfQuarter, locale, hassConfig),
      ];
    case "this_year":
      return [
        calcDate(today, startOfYear, locale, hassConfig),
        calcDate(today, endOfYear, locale, hassConfig),
      ];
    case "now-7d":
      return [
        calcDate(today, subDays, locale, hassConfig, 7),
        calcDate(today, subDays, locale, hassConfig, 0),
      ];
    case "now-30d":
      return [
        calcDate(today, subDays, locale, hassConfig, 30),
        calcDate(today, subDays, locale, hassConfig, 0),
      ];
    case "now-12m":
      return [
        calcDate(
          today,
          (date) => subMonths(startOfMonth(date), 11),
          locale,
          hassConfig
        ),
        calcDate(today, endOfMonth, locale, hassConfig),
      ];
    case "now-365d":
      return [
        calcDate(today, subMonths, locale, hassConfig, 12),
        calcDate(today, subMonths, locale, hassConfig, 0),
      ];
    case "now-1h":
      return [
        calcDate(today, subHours, locale, hassConfig, 1),
        calcDate(today, subHours, locale, hassConfig, 0),
      ];
    case "now-12h":
      return [
        calcDate(today, subHours, locale, hassConfig, 12),
        calcDate(today, subHours, locale, hassConfig, 0),
      ];
    case "now-24h":
      return [
        calcDate(today, subHours, locale, hassConfig, 24),
        calcDate(today, subHours, locale, hassConfig, 0),
      ];
  }
  return [today, today];
};
