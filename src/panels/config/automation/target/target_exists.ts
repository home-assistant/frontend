import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import type { TargetType } from "../../../../data/target";
import type { HomeAssistant, HomeAssistantRegistries } from "../../../../types";

const hasKey = (obj: object, key: string) =>
  Object.prototype.hasOwnProperty.call(obj, key);

/**
 * Check whether a target exists in the registries. Entities also need a
 * registry entry, as only those are part of the target tree.
 */
export const targetExists = (
  registries: HomeAssistantRegistries,
  states: HomeAssistant["states"],
  labels: LabelRegistryEntry[] | undefined,
  targetType: TargetType,
  targetId: string
): boolean => {
  switch (targetType) {
    case "entity":
      return hasKey(states, targetId) && hasKey(registries.entities, targetId);
    case "device":
      return hasKey(registries.devices, targetId);
    case "area":
      return hasKey(registries.areas, targetId);
    case "floor":
      return hasKey(registries.floors, targetId);
    case "label":
      return !!labels?.some((label) => label.label_id === targetId);
    default:
      return false;
  }
};
