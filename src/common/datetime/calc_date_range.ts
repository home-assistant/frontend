import {
  addDays,
  subHours,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  startOfQuarter,
  endOfQuarter,
  subDays,
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
  | "now-12m"
  | "now-1h"
  | "now-12h"
  | "now-24h";

export const calcDateRange = (
  hass: HomeAssistant,
  range: DateRange
): [Date, Date] => {
  const today = new Date();
  const weekStartsOn = firstWeekdayIndex(hass.locale);
  switch (range) {
    case "today":
      return [
        calcDate(today, startOfDay, hass.locale, hass.config, {
          weekStartsOn,
        }),
        calcDate(today, endOfDay, hass.locale, hass.config, {
          weekStartsOn,
        }),
      ];
    case "yesterday":
      return [
        calcDate(addDays(today, -1), startOfDay, hass.locale, hass.config, {
          weekStartsOn,
        }),
        calcDate(addDays(today, -1), endOfDay, hass.locale, hass.config, {
          weekStartsOn,
        }),
      ];
    case "this_week":
      return [
        calcDate(today, startOfWeek, hass.locale, hass.config, {
          weekStartsOn,
        }),
        calcDate(today, endOfWeek, hass.locale, hass.config, {
          weekStartsOn,
        }),
      ];
    case "this_month":
      return [
        calcDate(today, startOfMonth, hass.locale, hass.config),
        calcDate(today, endOfMonth, hass.locale, hass.config),
      ];
    case "this_quarter":
      return [
        calcDate(today, startOfQuarter, hass.locale, hass.config),
        calcDate(today, endOfQuarter, hass.locale, hass.config),
      ];
    case "this_year":
      return [
        calcDate(today, startOfYear, hass.locale, hass.config),
        calcDate(today, endOfYear, hass.locale, hass.config),
      ];
    case "now-7d":
      return [
        calcDate(today, subDays, hass.locale, hass.config, 7),
        calcDate(today, subDays, hass.locale, hass.config, 0),
      ];
    case "now-30d":
      return [
        calcDate(today, subDays, hass.locale, hass.config, 30),
        calcDate(today, subDays, hass.locale, hass.config, 0),
      ];
    case "now-12m":
      return [
        calcDate(subMonths(today, 12), startOfMonth, hass.locale, hass.config),
        calcDate(subMonths(today, 1), endOfMonth, hass.locale, hass.config),
      ];
    case "now-1h":
      return [
        calcDate(today, subHours, hass.locale, hass.config, 1),
        calcDate(today, subHours, hass.locale, hass.config, 0),
      ];
    case "now-12h":
      return [
        calcDate(today, subHours, hass.locale, hass.config, 12),
        calcDate(today, subHours, hass.locale, hass.config, 0),
      ];
    case "now-24h":
      return [
        calcDate(today, subHours, hass.locale, hass.config, 24),
        calcDate(today, subHours, hass.locale, hass.config, 0),
      ];
  }
  return [today, today];
};
