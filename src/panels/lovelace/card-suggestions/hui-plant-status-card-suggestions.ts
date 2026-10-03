import { computeDomain } from "../../../common/entity/compute_domain";
import type { PlantStatusCardConfig } from "../cards/types";
import type { CardSuggestionProvider } from "./types";

export const plantStatusCardSuggestions: CardSuggestionProvider<PlantStatusCardConfig> =
  {
    getEntitySuggestion(_hass, entityId) {
      if (computeDomain(entityId) !== "plant") return null;
      return {
        config: { type: "plant-status", entity: entityId },
      };
    },
  };
