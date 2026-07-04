import type { RelatedContextItem } from "../../../data/context";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import { getConfigEntityId } from "./get-config-entity-id";

export const getConfigRelatedContext = (
  config: LovelaceCardConfig
): RelatedContextItem | undefined => {
  if (config.type === "area" && typeof config.area === "string") {
    return { itemType: "area", itemId: config.area };
  }
  const entityId = getConfigEntityId(config);
  return entityId ? { itemType: "entity", itemId: entityId } : undefined;
};
