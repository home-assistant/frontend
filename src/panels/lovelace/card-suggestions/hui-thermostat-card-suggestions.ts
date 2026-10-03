import { computeDomain } from "../../../common/entity/compute_domain";
import type { ThermostatCardConfig } from "../cards/types";
import type { CardSuggestionProvider } from "./types";

const SUPPORTED_DOMAINS = new Set(["climate", "water_heater"]);

export const thermostatCardSuggestions: CardSuggestionProvider<ThermostatCardConfig> =
  {
    getEntitySuggestion(_hass, entityId) {
      if (!SUPPORTED_DOMAINS.has(computeDomain(entityId))) return null;
      return {
        config: { type: "thermostat", entity: entityId },
      };
    },
  };
