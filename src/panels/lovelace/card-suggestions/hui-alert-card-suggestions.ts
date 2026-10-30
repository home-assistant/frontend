import { ALERT_DOMAINS } from "../../../common/entity/alert_active";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { AlertCardConfig } from "../cards/types";
import type { CardSuggestionProvider } from "./types";

export const alertCardSuggestions: CardSuggestionProvider<AlertCardConfig> = {
  getEntitySuggestion(_hass, entityId) {
    if (!ALERT_DOMAINS.includes(computeDomain(entityId))) {
      return null;
    }

    return { config: { type: "alert", entity: entityId } };
  },
};
