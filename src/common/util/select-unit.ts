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
const SECS_PER_DAY = SECS_PER_HOUR * 24;
const SECS_PER_WEEK = SECS_PER_DAY * 7;

// Adapted from https://github.com/formatjs/formatjs/blob/186cef62f980ec66252ee232f438a42d0b51b9f9/packages/intl-utils/src/diff.ts
export function selectUnit(
  from: Date | number,
  to: Date | number = Date.now(),
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

  const days = secs / SECS_PER_DAY;
  if (Math.abs(days) < resolvedThresholds.day) {
    return {
      value: Math.round(days),
      unit: "day",
    };
  }

  const weeks = secs / SECS_PER_WEEK;
  if (Math.abs(weeks) < resolvedThresholds.week) {
    return {
      value: Math.round(weeks),
      unit: "week",
    };
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);
  const years = fromDate.getFullYear() - toDate.getFullYear();
  const months = years * 12 + fromDate.getMonth() - toDate.getMonth();
  if (Math.round(Math.abs(months)) < resolvedThresholds.month) {
    return {
      value: Math.round(months),
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
