import type { EntityBadgeConfig } from "../badges/types";
import type { BadgeSuggestion, BadgeSuggestionProvider } from "./types";

export const entityBadgeSuggestions: BadgeSuggestionProvider<EntityBadgeConfig> =
  {
    getEntitySuggestion(hass, entityId) {
      const suggestions: BadgeSuggestion<EntityBadgeConfig>[] = [
        {
          config: { type: "entity", entity: entityId },
        },
        {
          label: hass.localize(
            "ui.panel.lovelace.editor.badge_picker.with_name"
          ),
          config: { type: "entity", entity: entityId, show_name: true },
        },
      ];
      return suggestions;
    },
  };
