// Library for converting back and forth from values use by this webcomponent
// and the values defined by rrule.js.
import { RRule, Frequency, Weekday } from "rrule";
import type { WeekdayStr } from "rrule";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  getDate,
  getDay,
  getMonth,
} from "date-fns";

export type RepeatFrequency =
  | "none"
  | "yearly"
  | "monthly"
  | "weekly"
  | "daily";

export type RepeatEnd = "never" | "on" | "after";

export const DEFAULT_COUNT = {
  none: 1,
  yearly: 5,
  monthly: 12,
  weekly: 13,
  daily: 30,
};

export function intervalSuffix(freq: RepeatFrequency) {
  if (freq === "monthly") {
    return "months";
  }
  if (freq === "weekly") {
    return "weeks";
  }
  return "days";
}

export function untilValue(freq: RepeatFrequency): Date {
  const today = new Date();
  const increment = DEFAULT_COUNT[freq];
  switch (freq) {
    case "yearly":
      return addYears(today, increment);
    case "monthly":
      return addMonths(today, increment);
    case "weekly":
      return addWeeks(today, increment);
    case "daily":
    default:
      return addDays(today, increment);
  }
}

export const convertFrequency = (
  freq: Frequency
): RepeatFrequency | undefined => {
  switch (freq) {
    case Frequency.YEARLY:
      return "yearly";
    case Frequency.MONTHLY:
      return "monthly";
    case Frequency.WEEKLY:
      return "weekly";
    case Frequency.DAILY:
      return "daily";
    default:
      return undefined;
  }
};

export const convertRepeatFrequency = (
  freq: RepeatFrequency
): Frequency | undefined => {
  switch (freq) {
    case "yearly":
      return Frequency.YEARLY;
    case "monthly":
      return Frequency.MONTHLY;
    case "weekly":
      return Frequency.WEEKLY;
    case "daily":
      return Frequency.DAILY;
    default:
      return undefined;
  }
};

export const WEEKDAY_NAME = {
  SU: "Sun",
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
};

export const WEEKDAYS = [
  RRule.SU,
  RRule.MO,
  RRule.TU,
  RRule.WE,
  RRule.TH,
  RRule.FR,
  RRule.SA,
];

/** Return a weekday number compatible with rrule.js weekdays */
export function getWeekday(dtstart: Date): number {
  let weekDay = getDay(dtstart) - 1;
  if (weekDay < 0) {
    weekDay += 7;
  }
  return weekDay;
}

export function getWeekdays(firstDay?: number) {
  if (firstDay === undefined || firstDay === 0) {
    return WEEKDAYS;
  }
  let iterator = firstDay;
  const weekDays: Weekday[] = [...WEEKDAYS];
  while (iterator > 0) {
    weekDays.push(weekDays.shift() as Weekday);
    iterator -= 1;
  }
  return weekDays;
}

export function ruleByWeekDay(
  weekdays: Set<WeekdayStr>
): Weekday[] | undefined {
  return Array.from(weekdays).map((value: string) => {
    switch (value) {
      case "MO":
        return RRule.MO;
      case "TU":
        return RRule.TU;
      case "WE":
        return RRule.WE;
      case "TH":
        return RRule.TH;
      case "FR":
        return RRule.FR;
      case "SA":
        return RRule.SA;
      case "SU":
        return RRule.SU;
      default:
        return RRule.MO;
    }
  });
}

/**
 * Determine the recurrence options based on the day of the month, e.g. "First Saturday" or "3rd Wednesday".
 */
export function getWeekydaysForMonth(dtstart: Date): Weekday[] {
  const weekDay = getWeekday(dtstart);
  const dayOfMonth = getDate(dtstart);
  const weekOfMonth = Math.floor((dayOfMonth - 1) / 7) + 1;
  const isLastWeekday = getMonth(dtstart) !== getMonth(addDays(dtstart, 7));
  const byweekdays: Weekday[] = [];
  if (!isLastWeekday || dayOfMonth <= 28) {
    byweekdays.push(new Weekday(weekDay, weekOfMonth));
  }
  if (isLastWeekday) {
    byweekdays.push(new Weekday(weekDay, -1));
  }
  return byweekdays;
}
