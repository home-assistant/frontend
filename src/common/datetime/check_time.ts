import { TZDate } from "@date-fns/tz";
import { isBefore, isAfter, isWithinInterval } from "date-fns";
import type { HomeAssistant } from "../../types";
import { TimeZone } from "../../data/translation";
import { WEEKDAY_MAP } from "./weekday";
import type { TimeCondition } from "../../panels/lovelace/common/validate-condition";

/**
 * Validate a time string format and value ranges without creating Date objects
 * @param timeString Time string to validate (HH:MM or HH:MM:SS)
 * @returns true if valid, false otherwise
 */
export function isValidTimeString(timeString: string): boolean {
  // Reject empty strings
  if (!timeString || timeString.trim() === "") {
    return false;
  }

  const parts = timeString.split(":");

  if (parts.length < 2 || parts.length > 3) {
    return false;
  }

  // Ensure each part contains only digits (and optional leading zeros)
  // This prevents "8:00 AM" from passing validation
  if (!parts.every((part) => /^\d+$/.test(part))) {
    return false;
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parts.length === 3 ? parseInt(parts[2], 10) : 0;

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    return false;
  }

  return (
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59 &&
    seconds >= 0 &&
    seconds <= 59
  );
}

/**
 * Parse a time string (HH:MM or HH:MM:SS) and set it on today's date in the given timezone
 *
 * Note: This function assumes the time string has already been validated by
 * isValidTimeString() at configuration time. It does not re-validate at runtime
 * for consistency with other condition types (screen, user, location, etc.)
 *
 * @param timeString The time string to parse (must be pre-validated)
 * @param timezone The timezone to use
 * @returns The Date object
 */
export const parseTimeString = (timeString: string, timezone: string): Date => {
  const parts = timeString.split(":");
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parts.length === 3 ? parseInt(parts[2], 10) : 0;

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
      return !isBefore(now, afterDate) || !isAfter(now, beforeDate);
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
