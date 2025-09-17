import type { HassEntity } from "home-assistant-js-websocket";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import type { EntityNameType } from "../../../../common/translations/entity-state";
import type { HomeAssistant } from "../../../../types";

export const ENTITY_NAME_PRESETS = [
  "entity_name",
  "device_name",
  "device_entity_name",
  "area_name",
  "area_device_name",
  "floor_name",
  "friendly_name",
] as const;

export type EntityNamePreset = (typeof ENTITY_NAME_PRESETS)[number];

export const NAME_PRESET_TYPES: Partial<
  Record<EntityNamePreset, EntityNameType | EntityNameType[]>
> = {
  entity_name: "entity",
  device_name: "device",
  device_entity_name: ["device", "entity"],
  area_name: "area",
  area_device_name: ["area", "device"],
  floor_name: "floor",
};

const DEFAULT_PRESET = "friendly_name";

export const computeEntityDisplayName = (
  hass: HomeAssistant,
  stateObj: HassEntity,
  nameOrPreset: string | undefined = DEFAULT_PRESET
) => {
  if (nameOrPreset === "friendly_name") {
    return computeStateName(stateObj);
  }

  // Special case for "entity" preset to fall back to device name if entity name is empty
  if (nameOrPreset === "entity_name") {
    return (
      hass.formatEntityName(stateObj, "entity") ||
      hass.formatEntityName(stateObj, "device")
    );
  }

  if (nameOrPreset in NAME_PRESET_TYPES) {
    const types = NAME_PRESET_TYPES[nameOrPreset] as
      | EntityNameType
      | EntityNameType[];

    return hass.formatEntityName(stateObj, types);
  }

  return nameOrPreset || computeStateName(stateObj);
};
