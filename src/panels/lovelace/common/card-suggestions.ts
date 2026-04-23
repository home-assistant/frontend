import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import { pickBestTileFeatures } from "../card-suggestions/hui-tile-card-suggestions";
import { CARD_SUGGESTION_PROVIDERS } from "../card-suggestions/registry";
import type { CardSuggestion } from "../card-suggestions/types";

export type { CardSuggestion } from "../card-suggestions/types";

const GRID_COLUMNS = 2;

const buildMultiEntitySuggestions = (
  hass: HomeAssistant,
  entityIds: string[]
): CardSuggestion[] => {
  const plainTiles: LovelaceCardConfig[] = entityIds.map((id) => ({
    type: "tile",
    entity: id,
  }));

  const featuredTiles: LovelaceCardConfig[] = entityIds.map((id) => {
    const features = pickBestTileFeatures(hass, id);
    return features.length
      ? {
          type: "tile",
          entity: id,
          features: features.map((type) => ({ type })),
        }
      : { type: "tile", entity: id };
  });
  const anyFeature = featuredTiles.some(
    (tile) => (tile as { features?: unknown[] }).features?.length
  );

  const prefix = "ui.panel.lovelace.editor.cardpicker.suggestions.";
  return [
    {
      id: "tile-cards",
      label: hass.localize(`${prefix}tile_cards`),
      flattenInSection: true,
      config: {
        type: "grid",
        columns: GRID_COLUMNS,
        square: false,
        cards: plainTiles,
      },
    },
    ...(anyFeature
      ? [
          {
            id: "tile-cards-with-features",
            label: hass.localize(`${prefix}featured_tile_cards`),
            flattenInSection: true,
            config: {
              type: "grid",
              columns: GRID_COLUMNS,
              square: false,
              cards: featuredTiles,
            },
          },
        ]
      : []),
    {
      id: "entities-card",
      label: hass.localize(`${prefix}entities_card`),
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
  return buildMultiEntitySuggestions(hass, validIds);
};
