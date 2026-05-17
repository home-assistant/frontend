import { computeDomain } from "../../../common/entity/compute_domain";
import type { CalendarCardConfig } from "../cards/types";
import type { CardSuggestionProvider } from "./types";

export const calendarCardSuggestions: CardSuggestionProvider<CalendarCardConfig> =
  {
    getEntitySuggestion(hass, entityId) {
      if (computeDomain(entityId) !== "calendar") return null;
      return {
        id: "calendar",
        label: hass.localize(
          "ui.panel.lovelace.editor.cardpicker.suggestions.calendar"
        ),
        config: { type: "calendar", entities: [entityId] },
      };
    },
  };
