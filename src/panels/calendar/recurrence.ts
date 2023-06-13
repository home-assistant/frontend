// Library for converting back and forth from values use by this webcomponent
// and the values defined by rrule.js.
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  getDate,
  getDay,
  isLastDayOfMonth,
  isSameMonth,
} from "date-fns";
import type { Options, WeekdayStr } from "rrule";
import { Frequency, RRule, Weekday } from "rrule";
import { formatDate } from "../../common/datetime/format_date";
import { capitalizeFirstLetter } from "../../common/string/capitalize-first-letter";
import { dayNames } from "../../common/translations/day_names";
import { monthNames } from "../../common/translations/month_names";
import { HomeAssistant } from "../../types";

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

export interface MonthlyRepeatItem {
  value: string;
  byday?: Weekday;
  bymonthday?: number;
  label: string;
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

export function getWeekdays(firstDay?: number): Weekday[] {
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

export function ruleByWeekDay(weekdays: Set<WeekdayStr>): Weekday[] {
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
 * Determine the recurrence options based on the day of the month. The
 * return values are a Weekday object that represent a BYDAY for a
 * particular week of the month like "first Saturday" or "last Friday".
 */
function getWeekydaysForMonth(dtstart: Date): Weekday[] {
  const weekDay = getWeekday(dtstart);
  const dayOfMonth = getDate(dtstart);
  const nthWeekdayOfMonth = Math.floor((dayOfMonth - 1) / 7) + 1;
  const isLastWeekday = !isSameMonth(dtstart, addDays(dtstart, 7));
  const byweekdays: Weekday[] = [];
  if (!isLastWeekday || dayOfMonth <= 28) {
    byweekdays.push(new Weekday(weekDay, nthWeekdayOfMonth));
  }
  if (isLastWeekday) {
    byweekdays.push(new Weekday(weekDay, -1));
  }
  return byweekdays;
}

/**
 * Returns the list of repeat values available for the specified date.
 */
export function getMonthlyRepeatItems(
  hass: HomeAssistant,
  interval: number,
  dtstart: Date
): MonthlyRepeatItem[] {
  const getLabel = (repeatValue: string) =>
    renderRRuleAsText(hass, `FREQ=MONTHLY;INTERVAL=${interval};${repeatValue}`);

  const result: MonthlyRepeatItem[] = [
    // The default repeat rule is on day of month e.g. 3rd day of month
    {
      value: `BYMONTHDAY=${getDate(dtstart)}`,
      label: getLabel(`BYMONTHDAY=${getDate(dtstart)}`)!,
    },
    // Additional optional rules based on the week of month e.g. 2nd sunday of month
    ...getWeekydaysForMonth(dtstart).map((item) => ({
      value: `BYDAY=${item.toString()}`,
      byday: item,
      label: getLabel(`BYDAY=${item.toString()}`)!,
    })),
  ];
  if (isLastDayOfMonth(dtstart)) {
    result.push({
      value: "BYMONTHDAY=-1",
      bymonthday: -1,
      label: getLabel(`BYMONTHDAY=-1`)!,
    });
  }
  return result;
}

export function getMonthlyRepeatWeekdayFromRule(
  rrule: Partial<Options>
): Weekday | undefined {
  if (rrule.freq !== Frequency.MONTHLY) {
    return undefined;
  }
  if (
    rrule.byweekday &&
    Array.isArray(rrule.byweekday) &&
    rrule.byweekday.length === 1 &&
    rrule.byweekday[0] instanceof Weekday
  ) {
    return rrule.byweekday[0];
  }
  return undefined;
}

export function getMonthdayRepeatFromRule(
  rrule: Partial<Options>
): number | undefined {
  if (rrule.freq !== Frequency.MONTHLY || !rrule.bymonthday) {
    return undefined;
  }
  if (Array.isArray(rrule.bymonthday)) {
    return rrule.bymonthday[0];
  }
  return rrule.bymonthday;
}

/**
 * A wrapper around RRule.toText that assists with translation.
 */
export function renderRRuleAsText(hass: HomeAssistant, value: string) {
  const rule = RRule.fromString(`RRULE:${value}`);
  if (!rule.isFullyConvertibleToText()) {
    return undefined;
  }
  return capitalizeFirstLetter(
    rule.toText(
      (id: string | number | Weekday): string => {
        if (typeof id === "string") {
          return hass.localize(`ui.components.calendar.event.rrule.${id}`);
        }
        return "";
      },
      {
        dayNames: dayNames(hass.locale, hass.config),
        monthNames: monthNames(hass.locale, hass.config),
        tokens: {},
      },
      // Format the date
      (year: number, month: string, day: number): string => {
        if (!year || !month || !day) {
          return "";
        }
        // Build date so we can then format it
        const date = new Date();
        date.setFullYear(year);
        // As input we already get the localized month name, so we now unfortunately
        // need to convert it back to something Date can work with. The already localized
        // months names are a must in the RRule.Language structure (an empty string[] would
        // mean we get undefined months input in this method here).
        date.setMonth(monthNames(hass.locale, hass.config).indexOf(month));
        date.setDate(day);
        return formatDate(date, hass.locale, hass.config);
      }
    )
  );
}
