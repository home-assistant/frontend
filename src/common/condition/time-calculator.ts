import { TZDate } from "@date-fns/tz";
import {
  startOfDay,
  addDays,
  addMinutes,
  differenceInMilliseconds,
} from "date-fns";
import type { HomeAssistant } from "../../types";
import { TimeZone } from "../../data/translation";
import { parseTimeString } from "../datetime/check_time";
import type { TimeCondition } from "../../panels/lovelace/common/validate-condition";

/**
 * Calculate milliseconds until next time boundary for a time condition
 * @param hass Home Assistant object
 * @param timeCondition Time condition to calculate next update for
 * @returns Milliseconds until next boundary, or undefined if no boundaries
 */
export function calculateNextTimeUpdate(
  hass: HomeAssistant,
  { after, before, weekdays }: Omit<TimeCondition, "condition">
): number | undefined {
  const timezone =
    hass.locale.time_zone === TimeZone.server
      ? hass.config.time_zone
      : Intl.DateTimeFormat().resolvedOptions().timeZone;

  const now = new TZDate(new Date(), timezone);
  const updates: Date[] = [];

  // Calculate next occurrence of after time
  if (after) {
    let afterDate = parseTimeString(after, timezone);
    if (afterDate <= now) {
      // If time has passed today, schedule for tomorrow
      afterDate = addDays(afterDate, 1);
    }
    updates.push(afterDate);
  }

  // Calculate next occurrence of before time
  if (before) {
    let beforeDate = parseTimeString(before, timezone);
    if (beforeDate <= now) {
      // If time has passed today, schedule for tomorrow
      beforeDate = addDays(beforeDate, 1);
    }
    updates.push(beforeDate);
  }

  // If weekdays are specified, check for midnight (weekday transition)
  if (weekdays && weekdays.length > 0 && weekdays.length < 7) {
    // Calculate next midnight using startOfDay + addDays
    const tomorrow = addDays(now, 1);
    const midnight = startOfDay(tomorrow);
    updates.push(midnight);
  }

  if (updates.length === 0) {
    return undefined;
  }

  // Find the soonest update time
  const nextUpdate = updates.reduce((soonest, current) =>
    current < soonest ? current : soonest
  );

  // Add 1 minute buffer to ensure we're past the boundary
  const updateWithBuffer = addMinutes(nextUpdate, 1);

  // Calculate difference in milliseconds
  return differenceInMilliseconds(updateWithBuffer, now);
}
