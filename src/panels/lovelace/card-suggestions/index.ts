import { ensureArray } from "../../../common/array/ensure-array";
import { customCards } from "../../../data/lovelace_custom_cards";
import type { HomeAssistant } from "../../../types";
import { CARD_SUGGESTION_PROVIDERS } from "./registry";
import type { CardSuggestion } from "./types";

export type { CardSuggestion, CardSuggestionProvider } from "./types";
export { CARD_SUGGESTION_PROVIDERS } from "./registry";

export interface CardSuggestions {
  core: CardSuggestion[];
  custom: CardSuggestion[];
}

export const generateCardSuggestions = (
  hass: HomeAssistant,
  entityId: string | undefined
): CardSuggestions => {
  if (!entityId || hass.states[entityId] === undefined) {
    return { core: [], custom: [] };
  }
  const core = Object.values(CARD_SUGGESTION_PROVIDERS).flatMap((provider) => {
    try {
      return ensureArray(provider.getEntitySuggestion(hass, entityId)) ?? [];
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Card suggestion provider threw:", err);
      return [];
    }
  });
  const custom = customCards.flatMap((card) => {
    if (!card.getEntitySuggestion) return [];
    try {
      return ensureArray(card.getEntitySuggestion(hass, entityId)) ?? [];
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `Custom card "${card.type}" getEntitySuggestion threw:`,
        err
      );
      return [];
    }
  });
  return { core, custom };
};
