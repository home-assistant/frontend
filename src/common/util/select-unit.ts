import { differenceInDays, differenceInWeeks, startOfWeek } from "date-fns/esm";
import { FrontendLocaleData } from "../../data/translation";
import { firstWeekdayIndex } from "../datetime/first_weekday";

export type Unit =
  | "second"
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "year";

const MS_PER_SECOND = 1e3;
const SECS_PER_MIN = 60;
const SECS_PER_HOUR = SECS_PER_MIN * 60;

// Adapted from https://github.com/formatjs/formatjs/blob/186cef62f980ec66252ee232f438a42d0b51b9f9/packages/intl-utils/src/diff.ts
export function selectUnit(
  from: Date | number,
  // eslint-disable-next-line @typescript-eslint/default-param-last
  to: Date | number = Date.now(),
  locale: FrontendLocaleData,
  thresholds: Partial<Thresholds> = {}
): { value: number; unit: Unit } {
  const resolvedThresholds: Thresholds = {
    ...DEFAULT_THRESHOLDS,
    ...(thresholds || {}),
  };

  const secs = (+from - +to) / MS_PER_SECOND;
  if (Math.abs(secs) < resolvedThresholds.second) {
    return {
      value: Math.round(secs),
      unit: "second",
    };
  }

  const mins = secs / SECS_PER_MIN;
  if (Math.abs(mins) < resolvedThresholds.minute) {
    return {
      value: Math.round(mins),
      unit: "minute",
    };
  }

  const hours = secs / SECS_PER_HOUR;
  if (Math.abs(hours) < resolvedThresholds.hour) {
    return {
      value: Math.round(hours),
      unit: "hour",
    };
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  // Set time component to zero, which allows us to compare only the days
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(0, 0, 0, 0);

  const days = differenceInDays(fromDate, toDate);
  if (days === 0) {
    return {
      value: Math.round(hours),
      unit: "hour",
    };
  }
  if (Math.abs(days) < resolvedThresholds.day) {
    return {
      value: days,
      unit: "day",
    };
  }

  const firstWeekday = firstWeekdayIndex(locale);
  const fromWeek = startOfWeek(fromDate, { weekStartsOn: firstWeekday });
  const toWeek = startOfWeek(toDate, { weekStartsOn: firstWeekday });

  const weeks = differenceInWeeks(fromWeek, toWeek);
  if (weeks === 0) {
    return {
      value: days,
      unit: "day",
    };
  }
  if (Math.abs(weeks) < resolvedThresholds.week) {
    return {
      value: weeks,
      unit: "week",
    };
  }

  const years = fromDate.getFullYear() - toDate.getFullYear();
  const months = years * 12 + fromDate.getMonth() - toDate.getMonth();
  if (months === 0) {
    return {
      value: weeks,
      unit: "week",
    };
  }
  if (Math.abs(months) < resolvedThresholds.month || years === 0) {
    return {
      value: months,
      unit: "month",
    };
  }

  return {
    value: Math.round(years),
    unit: "year",
  };
}

type Thresholds = Record<
  "second" | "minute" | "hour" | "day" | "week" | "month",
  number
>;

export const DEFAULT_THRESHOLDS: Thresholds = {
  second: 45, // seconds to minute
  minute: 45, // minutes to hour
  hour: 22, // hour to day
  day: 5, // day to week
  week: 4, // week to months
  month: 11, // month to years
};
