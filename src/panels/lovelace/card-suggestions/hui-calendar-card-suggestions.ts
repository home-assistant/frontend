import { computeDomain } from "../../../common/entity/compute_domain";
import type { CalendarCardConfig } from "../cards/types";
import type { CardSuggestionProvider } from "./types";

export const calendarCardSuggestions: CardSuggestionProvider<CalendarCardConfig> =
  {
    getEntitySuggestion(_hass, entityId) {
      if (computeDomain(entityId) !== "calendar") return null;
      return {
        id: "calendar",
        label: "Calendar",
        config: { type: "calendar", entities: [entityId] },
      };
    },
  };
