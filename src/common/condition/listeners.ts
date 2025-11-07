import { listenMediaQuery } from "../dom/media_query";
import type { HomeAssistant } from "../../types";
import type { Condition } from "../../panels/lovelace/common/validate-condition";
import { checkConditionsMet } from "../../panels/lovelace/common/validate-condition";
import { extractMediaQueries } from "./extract";

/**
 * Helper to setup media query listeners for conditional visibility
 */
export function setupMediaQueryListeners(
  conditions: Condition[],
  hass: HomeAssistant,
  addListener: (unsub: () => void) => void,
  onUpdate: (conditionsMet: boolean) => void
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
        const conditionsMet = checkConditionsMet(conditions, hass);
        onUpdate(conditionsMet);
      }
    });
    addListener(unsub);
  });
}
