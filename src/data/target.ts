import type { HassServiceTarget } from "home-assistant-js-websocket";
import { computeDomain } from "../common/entity/compute_domain";
import type { HaDevicePickerDeviceFilterFunc } from "../components/device/ha-device-picker";
import type { PickerComboBoxItem } from "../components/ha-picker-combo-box";
import type { HomeAssistant } from "../types";
import type { AreaRegistryEntry } from "./area/area_registry";
import type { FloorComboBoxItem } from "./area_floor_picker";
import type { DevicePickerItem } from "./device/device_picker";
import type { DeviceRegistryEntry } from "./device/device_registry";
import type { HaEntityPickerEntityFilterFunc } from "./entity/entity";
import type { EntityComboBoxItem } from "./entity/entity_picker";
import type { EntityRegistryDisplayEntry } from "./entity/entity_registry";

export const TARGET_SEPARATOR = "________";

export type TargetType = "entity" | "device" | "area" | "label" | "floor";
export type TargetTypeFloorless = Exclude<TargetType, "floor">;

export interface SingleHassServiceTarget {
  entity_id?: string;
  device_id?: string;
  area_id?: string;
  floor_id?: string;
  label_id?: string;
}

export interface ExtractFromTargetResult {
  missing_areas: string[];
  missing_devices: string[];
  missing_floors: string[];
  missing_labels: string[];
  referenced_areas: string[];
  referenced_devices: string[];
  referenced_entities: string[];
}

export interface ExtractFromTargetResultReferenced {
  referenced_areas: string[];
  referenced_devices: string[];
  referenced_entities: string[];
}

export const extractFromTarget = async (
  hass: HomeAssistant,
  target: HassServiceTarget
) =>
  hass.callWS<ExtractFromTargetResult>({
    type: "extract_from_target",
    target,
  });

export const getTriggersForTarget = async (
  callWS: HomeAssistant["callWS"],
  target: HassServiceTarget,
  expandGroup = true
) =>
  callWS<string[]>({
    type: "get_triggers_for_target",
    target,
    expand_group: expandGroup,
  });

export const getConditionsForTarget = async (
  callWS: HomeAssistant["callWS"],
  target: HassServiceTarget,
  expandGroup = true
) =>
  callWS<string[]>({
    type: "get_conditions_for_target",
    target,
    expand_group: expandGroup,
  });

export const getServicesForTarget = async (
  callWS: HomeAssistant["callWS"],
  target: HassServiceTarget,
  expandGroup = true
) =>
  callWS<string[]>({
    type: "get_services_for_target",
    target,
    expand_group: expandGroup,
  });

export const areaMeetsFilter = (
  area: AreaRegistryEntry,
  devices: HomeAssistant["devices"],
  entities: HomeAssistant["entities"],
  deviceFilter?: HaDevicePickerDeviceFilterFunc,
  includeDomains?: string[],
  includeDeviceClasses?: string[],
  states?: HomeAssistant["states"],
  entityFilter?: HaEntityPickerEntityFilterFunc
): boolean => {
  const areaDevices = Object.values(devices).filter(
    (device) => device.area_id === area.area_id
  );

  if (
    areaDevices.some((device) =>
      deviceMeetsFilter(
        device,
        entities,
        deviceFilter,
        includeDomains,
        includeDeviceClasses,
        states,
        entityFilter
      )
    )
  ) {
    return true;
  }

  const areaEntities = Object.values(entities).filter(
    (entity) => entity.area_id === area.area_id
  );

  if (
    areaEntities.some((entity) =>
      entityRegMeetsFilter(
        entity,
        false,
        includeDomains,
        includeDeviceClasses,
        states,
        entityFilter
      )
    )
  ) {
    return true;
  }

  return false;
};

export const deviceMeetsFilter = (
  device: DeviceRegistryEntry,
  entities: HomeAssistant["entities"],
  deviceFilter?: HaDevicePickerDeviceFilterFunc,
  includeDomains?: string[],
  includeDeviceClasses?: string[],
  states?: HomeAssistant["states"],
  entityFilter?: HaEntityPickerEntityFilterFunc
): boolean => {
  const devEntities = Object.values(entities).filter(
    (entity) => entity.device_id === device.id
  );

  if (
    !devEntities.some((entity) =>
      entityRegMeetsFilter(
        entity,
        false,
        includeDomains,
        includeDeviceClasses,
        states,
        entityFilter
      )
    )
  ) {
    return false;
  }

  if (deviceFilter) {
    return deviceFilter(device);
  }

  return true;
};

export const entityRegMeetsFilter = (
  entity: EntityRegistryDisplayEntry,
  includeSecondary = false,
  includeDomains?: string[],
  includeDeviceClasses?: string[],
  states?: HomeAssistant["states"],
  entityFilter?: HaEntityPickerEntityFilterFunc
): boolean => {
  if (entity.hidden || (entity.entity_category && !includeSecondary)) {
    return false;
  }

  if (
    includeDomains &&
    !includeDomains.includes(computeDomain(entity.entity_id))
  ) {
    return false;
  }
  if (includeDeviceClasses) {
    const stateObj = states?.[entity.entity_id];
    if (!stateObj) {
      return false;
    }
    if (
      !stateObj.attributes.device_class ||
      !includeDeviceClasses!.includes(stateObj.attributes.device_class)
    ) {
      return false;
    }
  }

  if (entityFilter) {
    const stateObj = states?.[entity.entity_id];
    if (!stateObj) {
      return false;
    }
    return entityFilter!(stateObj);
  }
  return true;
};

export const getTargetComboBoxItemType = (
  item:
    | PickerComboBoxItem
    | (FloorComboBoxItem & { last?: boolean | undefined })
    | EntityComboBoxItem
    | DevicePickerItem
) => {
  if (
    (item as FloorComboBoxItem).type === "area" ||
    (item as FloorComboBoxItem).type === "floor"
  ) {
    return (item as FloorComboBoxItem).type;
  }

  if ("domain" in item) {
    return "device";
  }

  if ("stateObj" in item) {
    return "entity";
  }

  if (item.id === "___EMPTY_SEARCH___") {
    return "empty";
  }

  return "label";
};
