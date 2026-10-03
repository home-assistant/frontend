import { computeDomain } from "../../../common/entity/compute_domain";
import type { HumidifierCardConfig } from "../cards/types";
import type { CardSuggestionProvider } from "./types";

export const humidifierCardSuggestions: CardSuggestionProvider<HumidifierCardConfig> =
  {
    getEntitySuggestion(_hass, entityId) {
      if (computeDomain(entityId) !== "humidifier") return null;
      return {
        config: { type: "humidifier", entity: entityId },
      };
    },
  };
