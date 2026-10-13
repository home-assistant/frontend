import { computeDomain } from "../../../common/entity/compute_domain";
import type { AlertBadgeConfig } from "../badges/types";
import { ALERT_DOMAINS } from "../cards/types";
import type { BadgeSuggestionProvider } from "./types";

export const alertBadgeSuggestions: BadgeSuggestionProvider<AlertBadgeConfig> =
  {
    getEntitySuggestion(_hass, entityId) {
      if (!ALERT_DOMAINS.includes(computeDomain(entityId))) {
        return [];
      }

      return [{ config: { type: "alert", entity: entityId, color: "red" } }];
    },
  };
