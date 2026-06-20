import { TZDate } from "@date-fns/tz";
import {
  startOfDay,
  addDays,
  addMinutes,
  differenceInMilliseconds,
  addSeconds,
} from "date-fns";
import type { HomeAssistant } from "../../types";
import { TimeZone } from "../../data/translation";
import { parseTimeString } from "../datetime/check_time";
import type {
  TimeCondition,
  EntityTimeCondition,
} from "../../panels/lovelace/common/validate-condition";
import type { HaDurationData } from "../../components/ha-duration-input";
import durationToSeconds from "../datetime/duration_to_seconds";

// Returns a date object consisisting of the time from an entity, adding
// an optional offset
export function parseEntityTime(
  entity: string,
  states: HomeAssistant["states"],
  offset?: HaDurationData | string,
  timestamp: "state" | "last_updated" | "last_changed" = "last_changed"
): Date {
  const stateDate = new Date(states[entity][timestamp]);
  return addSeconds(stateDate, durationToSeconds(offset || {}));
}

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

/**
 * Calculate milliseconds until next time boundary for a time condition
 * @param hass Home Assistant object
 * @param condition Entity Time condition to calculate next update for
 * @returns Milliseconds until next boundary, or undefined if no boundaries
 */
export function calculateNextEntityTimeUpdate(
  hass: HomeAssistant,
  { entity, timestamp, offset }: Omit<EntityTimeCondition, "condition">
): number | undefined {
  if (!entity) {
    return undefined;
  }
  const timezone =
    hass.locale.time_zone === TimeZone.server
      ? hass.config.time_zone
      : Intl.DateTimeFormat().resolvedOptions().timeZone;

  const now = new TZDate(new Date(), timezone);

  const entityDate = parseEntityTime(entity, hass.states, offset, timestamp);
  // Calculate next occurrence of after time

  return entityDate > now
    ? differenceInMilliseconds(entityDate, now)
    : undefined;
}
