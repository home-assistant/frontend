import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import type { TargetType } from "../../../../data/target";
import type { HomeAssistant, HomeAssistantRegistries } from "../../../../types";

export const targetExists = (
  registries: HomeAssistantRegistries,
  states: HomeAssistant["states"],
  labels: LabelRegistryEntry[] | undefined,
  targetType: TargetType,
  targetId: string
): boolean => {
  switch (targetType) {
    case "entity":
      return targetId in states;
    case "device":
      return targetId in registries.devices;
    case "area":
      return targetId in registries.areas;
    case "floor":
      return targetId in registries.floors;
    case "label":
      return !!labels?.some((label) => label.label_id === targetId);
    default:
      return false;
  }
};
