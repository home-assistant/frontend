import { ensureArray } from "../../../common/array/ensure-array";
import { customBadges } from "../../../data/lovelace_custom_cards";
import type { HomeAssistant } from "../../../types";
import { BADGE_SUGGESTION_PROVIDERS } from "./registry";
import type { BadgeSuggestion } from "./types";

export type { BadgeSuggestion, BadgeSuggestionProvider } from "./types";
export { BADGE_SUGGESTION_PROVIDERS } from "./registry";

export interface BadgeSuggestions {
  core: BadgeSuggestion[];
  custom: BadgeSuggestion[];
}

export const generateBadgeSuggestions = (
  hass: HomeAssistant,
  entityId: string | undefined
): BadgeSuggestions => {
  if (!entityId || hass.states[entityId] === undefined) {
    return { core: [], custom: [] };
  }
  const core = Object.values(BADGE_SUGGESTION_PROVIDERS).flatMap((provider) => {
    try {
      return ensureArray(provider.getEntitySuggestion(hass, entityId)) ?? [];
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Badge suggestion provider threw:", err);
      return [];
    }
  });
  const custom = customBadges.flatMap((badge) => {
    if (!badge.getEntitySuggestion) return [];
    try {
      return ensureArray(badge.getEntitySuggestion(hass, entityId)) ?? [];
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `Custom badge "${badge.type}" getEntitySuggestion threw:`,
        err
      );
      return [];
    }
  });
  return { core, custom };
};
