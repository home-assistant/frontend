import { computeDomain } from "../../../common/entity/compute_domain";
import type { AlertBadgeConfig } from "../badges/types";
import type { BadgeSuggestionProvider } from "./types";

const ALERT_DOMAINS = ["binary_sensor", "alarm_control_panel"];

export const alertBadgeSuggestions: BadgeSuggestionProvider<AlertBadgeConfig> =
  {
    getEntitySuggestion(_hass, entityId) {
      if (!ALERT_DOMAINS.includes(computeDomain(entityId))) {
        return [];
      }

      return [{ config: { type: "alert", entity: entityId, color: "red" } }];
    },
  };
