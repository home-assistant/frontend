import { listenMediaQuery } from "../dom/media_query";
import type { HomeAssistant } from "../../types";
import type {
  Condition,
  ConditionContext,
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
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const scheduleUpdate = () => {
      const delay = calculateNextTimeUpdate(hass, timeCondition);

      if (delay === undefined) return;

      // Cap delay to prevent setTimeout overflow
      const cappedDelay = Math.min(delay, MAX_TIMEOUT_DELAY);

      timeoutId = setTimeout(() => {
        if (delay <= MAX_TIMEOUT_DELAY) {
          const context = getContext?.() ?? {};
          const conditionsMet = checkConditionsMet(conditions, hass, context);
          onUpdate(conditionsMet);
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
