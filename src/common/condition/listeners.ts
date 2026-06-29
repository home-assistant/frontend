import { listenMediaQuery } from "../dom/media_query";
import type { HomeAssistant } from "../../types";
import type {
  TimeCondition,
  VisibilityCondition,
} from "../../panels/lovelace/common/validate-condition";
import { extractMediaQueries, extractTimeConditions } from "./extract";
import { calculateNextTimeUpdate } from "./time-calculator";

/** Maximum delay for setTimeout (2^31 - 1 milliseconds, ~24.8 days)
 * Values exceeding this will overflow and execute immediately
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout#maximum_delay_value
 */
const MAX_TIMEOUT_DELAY = 2147483647;

/**
 * Schedule a callback to fire at the next boundary of a time condition,
 * rescheduling itself afterwards. Delays beyond the setTimeout maximum are
 * capped and re-scheduled without firing (so the boundary is only reported
 * once it is actually reached). Registers a single cleanup function that
 * clears the pending timeout.
 */
function scheduleTimeBoundaryListener(
  getHass: () => HomeAssistant,
  timeCondition: Omit<TimeCondition, "condition">,
  addListener: (unsub: () => void) => void,
  onBoundary: () => void
): void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const scheduleUpdate = () => {
    // Read hass lazily so timezone changes are picked up on the next boundary.
    const delay = calculateNextTimeUpdate(getHass(), timeCondition);

    if (delay === undefined) return;

    // Cap delay to prevent setTimeout overflow
    const cappedDelay = Math.min(delay, MAX_TIMEOUT_DELAY);

    timeoutId = setTimeout(() => {
      if (delay <= MAX_TIMEOUT_DELAY) {
        onBoundary();
      }
      scheduleUpdate();
    }, cappedDelay);
  };

  // Register cleanup function once, outside of scheduleUpdate
  addListener(() => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  });

  scheduleUpdate();
}

/**
 * Observe the client-evaluated parts of a condition tree — `screen` media
 * queries and `time` boundaries — and invoke `onChange` whenever one of them
 * could have flipped.
 *
 * This does not evaluate the conditions itself: the caller recombines client
 * and server results on notification. Used by `ConditionEvaluatorController`,
 * which merges these client signals with the results of `subscribe_condition`
 * subscriptions.
 */
export function observeConditionChanges(
  conditions: VisibilityCondition[],
  getHass: () => HomeAssistant,
  addListener: (unsub: () => void) => void,
  onChange: () => void
): void {
  extractMediaQueries(conditions).forEach((mediaQuery) => {
    addListener(listenMediaQuery(mediaQuery, () => onChange()));
  });

  extractTimeConditions(conditions).forEach((timeCondition) => {
    scheduleTimeBoundaryListener(getHass, timeCondition, addListener, onChange);
  });
}
