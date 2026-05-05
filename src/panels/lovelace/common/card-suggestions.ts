import type { HomeAssistant } from "../../../types";
import { CARD_SUGGESTION_PROVIDERS } from "../card-suggestions/registry";
import type { CardSuggestion } from "../card-suggestions/types";

export type { CardSuggestion } from "../card-suggestions/types";

export const generateCardSuggestions = (
  hass: HomeAssistant,
  entityId: string | undefined
): CardSuggestion[] => {
  if (!entityId || hass.states[entityId] === undefined) return [];
  return Object.values(CARD_SUGGESTION_PROVIDERS).flatMap((provider) => {
    try {
      const result = provider.getEntitySuggestion(hass, entityId);
      if (!result) return [];
      return Array.isArray(result) ? result : [result];
    } catch {
      return [];
    }
  });
};
