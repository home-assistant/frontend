import type { HomeAssistant } from "../../../types";
import { CARD_SUGGESTION_PROVIDERS } from "./registry";
import type { CardSuggestion } from "./types";

export type { CardSuggestion, CardSuggestionProvider } from "./types";
export { CARD_SUGGESTION_PROVIDERS } from "./registry";

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
