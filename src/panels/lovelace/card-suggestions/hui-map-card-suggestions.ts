import { computeDomain } from "../../../common/entity/compute_domain";
import type { MapCardConfig } from "../cards/types";
import type { CardSuggestionProvider } from "./types";

const SUPPORTED_DOMAINS = new Set(["person", "device_tracker", "zone"]);

export const mapCardSuggestions: CardSuggestionProvider<MapCardConfig> = {
  getEntitySuggestion(_hass, entityId) {
    if (!SUPPORTED_DOMAINS.has(computeDomain(entityId))) return null;
    return {
      config: { type: "map", entities: [entityId] },
    };
  },
};
