import type { EntityRegistryEntry } from "../../data/entity_registry";
import type { HomeAssistant } from "../../types";
import { computeStateName } from "./compute_state_name";

export const computeEntityName = (
  hass: HomeAssistant,
  entity: EntityRegistryEntry
): string | null => {
  if (hass.states[entity.entity_id]) {
    return computeStateName(hass.states[entity.entity_id]);
  }
  return entity.name;
};
