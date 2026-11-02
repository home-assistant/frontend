import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import type { TargetType } from "../../../../data/target";
import type { HomeAssistant, HomeAssistantRegistries } from "../../../../types";

const hasKey = (obj: object, key: string) =>
  Object.prototype.hasOwnProperty.call(obj, key);

/**
 * Check whether a target exists and is part of the target tree. Entities need
 * a registry entry and disabled devices are left out, like in the tree.
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
      return (
        hasKey(registries.devices, targetId) &&
        !registries.devices[targetId].disabled_by
      );
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
