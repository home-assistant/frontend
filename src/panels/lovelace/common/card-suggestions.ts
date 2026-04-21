import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import { CARD_SUGGESTION_PROVIDERS } from "../card-suggestions/registry";
import type { CardSuggestion } from "../card-suggestions/types";

export type { CardSuggestion } from "../card-suggestions/types";

const GRID_COLUMNS = 2;

const buildMultiEntitySuggestions = (entityIds: string[]): CardSuggestion[] => {
  const tiles: LovelaceCardConfig[] = entityIds.map((id) => ({
    type: "tile",
    entity: id,
  }));

  return [
    {
      id: "grid-of-tiles",
      label: "Grid of tiles",
      config: {
        type: "grid",
        columns: GRID_COLUMNS,
        square: false,
        cards: tiles,
      },
    },
    {
      id: "entities-card",
      label: "Entities card",
      config: { type: "entities", entities: entityIds },
    },
  ];
};

const collectEntitySuggestions = (
  hass: HomeAssistant,
  entityId: string
): CardSuggestion[] =>
  Object.values(CARD_SUGGESTION_PROVIDERS).flatMap((provider) => {
    try {
      const result = provider.getEntitySuggestion(hass, entityId);
      if (!result) return [];
      return Array.isArray(result) ? result : [result];
    } catch {
      return [];
    }
  });

export const generateCardSuggestions = (
  hass: HomeAssistant,
  entityIds: string[]
): CardSuggestion[] => {
  const validIds = entityIds.filter((id) => hass.states[id] !== undefined);
  if (validIds.length === 0) return [];
  if (validIds.length === 1) return collectEntitySuggestions(hass, validIds[0]);
  return buildMultiEntitySuggestions(validIds);
};
