import { listenMediaQuery } from "../dom/media_query";
import type { HomeAssistant } from "../../types";
import type {
  Condition,
  ConditionContext,
  TimeCondition,
  VisibilityCondition,
} from "../../panels/lovelace/common/validate-condition";
import { checkConditionsMet } from "../../panels/lovelace/common/validate-condition";
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
  hass: HomeAssistant,
  timeCondition: Omit<TimeCondition, "condition">,
  addListener: (unsub: () => void) => void,
  onBoundary: () => void
): void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const scheduleUpdate = () => {
    const delay = calculateNextTimeUpdate(hass, timeCondition);

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
 * Helper to setup media query listeners for conditional visibility
 */
export function setupMediaQueryListeners(
  conditions: Condition[],
  hass: HomeAssistant,
  addListener: (unsub: () => void) => void,
  onUpdate: (conditionsMet: boolean) => void,
  getContext?: () => ConditionContext
): void {
  const mediaQueries = extractMediaQueries(conditions);

  if (mediaQueries.length === 0) return;

  // Optimization for single media query
  const hasOnlyMediaQuery =
    conditions.length === 1 &&
    conditions[0].condition === "screen" &&
    !!conditions[0].media_query;

  mediaQueries.forEach((mediaQuery) => {
    const unsub = listenMediaQuery(mediaQuery, (matches) => {
      if (hasOnlyMediaQuery) {
        onUpdate(matches);
      } else {
        const context = getContext?.() ?? {};
        const conditionsMet = checkConditionsMet(conditions, hass, context);
        onUpdate(conditionsMet);
      }
    });
    addListener(unsub);
  });
}

/**
 * Helper to setup time-based listeners for conditional visibility
 */
export function setupTimeListeners(
  conditions: Condition[],
  hass: HomeAssistant,
  addListener: (unsub: () => void) => void,
  onUpdate: (conditionsMet: boolean) => void,
  getContext?: () => ConditionContext
): void {
  const timeConditions = extractTimeConditions(conditions);

  if (timeConditions.length === 0) return;

  timeConditions.forEach((timeCondition) => {
    scheduleTimeBoundaryListener(hass, timeCondition, addListener, () => {
      const context = getContext?.() ?? {};
      const conditionsMet = checkConditionsMet(conditions, hass, context);
      onUpdate(conditionsMet);
    });
  });
}

/**
 * Sets up all condition listeners (media query, time) for conditional visibility.
 */
export function setupConditionListeners(
  conditions: Condition[],
  hass: HomeAssistant,
  addListener: (unsub: () => void) => void,
  onUpdate: (conditionsMet: boolean) => void,
  getContext?: () => ConditionContext
): void {
  setupMediaQueryListeners(conditions, hass, addListener, onUpdate, getContext);
  setupTimeListeners(conditions, hass, addListener, onUpdate, getContext);
}

/**
 * Observe the client-evaluated parts of a condition tree — `screen` media
 * queries and `time` boundaries — and invoke `onChange` whenever one of them
 * could have flipped.
 *
 * Unlike {@link setupConditionListeners}, this does not evaluate the conditions
 * itself: the caller recombines client and server results on notification. Used
 * by `ConditionEvaluatorController`, which merges these client signals with the
 * results of `subscribe_condition` subscriptions.
 */
export function observeConditionChanges(
  conditions: VisibilityCondition[],
  hass: HomeAssistant,
  addListener: (unsub: () => void) => void,
  onChange: () => void
): void {
  extractMediaQueries(conditions).forEach((mediaQuery) => {
    addListener(listenMediaQuery(mediaQuery, () => onChange()));
  });

  extractTimeConditions(conditions).forEach((timeCondition) => {
    scheduleTimeBoundaryListener(hass, timeCondition, addListener, onChange);
  });
}
