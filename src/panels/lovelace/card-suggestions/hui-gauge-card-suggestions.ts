import { computeDomain } from "../../../common/entity/compute_domain";
import type { GaugeCardConfig } from "../cards/types";
import type { CardSuggestionProvider } from "./types";

export const gaugeCardSuggestions: CardSuggestionProvider<GaugeCardConfig> = {
  getEntitySuggestion(hass, entityId) {
    if (computeDomain(entityId) !== "sensor") return null;
    const stateObj = hass.states[entityId];
    if (!stateObj || isNaN(Number(stateObj.state))) return null;
    if (stateObj.attributes.unit_of_measurement !== "%") return null;
    return {
      config: { type: "gauge", entity: entityId },
    };
  },
};
