import { computeDomain } from "../../../common/entity/compute_domain";
import type { HistoryGraphCardConfig } from "../cards/types";
import type { CardSuggestionProvider } from "./types";

const SUPPORTED_DOMAINS = new Set([
  "counter",
  "input_number",
  "number",
  "sensor",
]);

export const historyGraphCardSuggestions: CardSuggestionProvider<HistoryGraphCardConfig> =
  {
    getEntitySuggestion(hass, entityId) {
      if (!SUPPORTED_DOMAINS.has(computeDomain(entityId))) return null;
      const stateObj = hass.states[entityId];
      if (!stateObj || isNaN(Number(stateObj.state))) return null;
      return {
        config: {
          type: "history-graph",
          entities: [entityId],
          hours_to_show: 24,
        },
      };
    },
  };
