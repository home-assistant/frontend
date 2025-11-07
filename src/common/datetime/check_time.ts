import { TZDate } from "@date-fns/tz";
import { isBefore, isAfter, isWithinInterval } from "date-fns";
import type { HomeAssistant } from "../../types";
import { TimeZone } from "../../data/translation";
import { WEEKDAY_MAP } from "./weekday";
import type { TimeCondition } from "../../panels/lovelace/common/validate-condition";

/**
 * Parse a time string (HH:MM or HH:MM:SS) and set it on today's date in the given timezone
 * @param timeString The time string to parse
 * @param timezone The timezone to use
 * @returns The Date object
 */
export const parseTimeString = (timeString: string, timezone: string): Date => {
  const parts = timeString.split(":");

  if (parts.length < 2 || parts.length > 3) {
    throw new Error(
      `Invalid time format: ${timeString}. Expected HH:MM or HH:MM:SS`
    );
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parts.length === 3 ? parseInt(parts[2], 10) : 0;

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    throw new Error(`Invalid time values in: ${timeString}`);
  }

  // Add range validation
  if (hours < 0 || hours > 23) {
    throw new Error(`Invalid hours in: ${timeString}. Must be 0-23`);
  }
  if (minutes < 0 || minutes > 59) {
    throw new Error(`Invalid minutes in: ${timeString}. Must be 0-59`);
  }
  if (seconds < 0 || seconds > 59) {
    throw new Error(`Invalid seconds in: ${timeString}. Must be 0-59`);
  }

  const now = new TZDate(new Date(), timezone);
  const dateWithTime = new TZDate(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    seconds,
    0,
    timezone
  );

  return new Date(dateWithTime.getTime());
};

/**
 * Check if the current time matches the time condition (after/before/weekday)
 * @param hass Home Assistant object
 * @param timeCondition Time condition to check
 * @returns true if current time matches the condition
 */
export const checkTimeInRange = (
  hass: HomeAssistant,
  { after, before, weekdays }: Omit<TimeCondition, "condition">
): boolean => {
  const timezone =
    hass.locale.time_zone === TimeZone.server
      ? hass.config.time_zone
      : Intl.DateTimeFormat().resolvedOptions().timeZone;

  const now = new TZDate(new Date(), timezone);

  // Check weekday condition
  if (weekdays && weekdays.length > 0) {
    const currentWeekday = WEEKDAY_MAP[now.getDay()];
    if (!weekdays.includes(currentWeekday)) {
      return false;
    }
  }

  // Check time conditions
  if (!after && !before) {
    return true;
  }

  const afterDate = after ? parseTimeString(after, timezone) : undefined;
  const beforeDate = before ? parseTimeString(before, timezone) : undefined;

  if (afterDate && beforeDate) {
    if (isBefore(beforeDate, afterDate)) {
      // Crosses midnight (e.g., 22:00 to 06:00)
      return isAfter(now, afterDate) || isBefore(now, beforeDate);
    }
    return isWithinInterval(now, { start: afterDate, end: beforeDate });
  }

  if (afterDate) {
    return !isBefore(now, afterDate);
  }

  if (beforeDate) {
    return !isAfter(now, beforeDate);
  }

  return true;
};
