import type { HassEntity } from "home-assistant-js-websocket";
import type {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
} from "../../data/entity/entity_registry";
import type { HomeAssistant } from "../../types";
import { ensureArray } from "../array/ensure-array";
import { computeRTL } from "../util/compute_rtl";
import { computeAreaName } from "./compute_area_name";
import { computeDeviceName } from "./compute_device_name";
import {
  computeEntityEntryName,
  computeEntityName,
  entityUseDeviceName,
} from "./compute_entity_name";
import { computeFloorName } from "./compute_floor_name";
import { computeStateName } from "./compute_state_name";
import {
  getEntityContext,
  getEntityEntryContext,
} from "./context/get_entity_context";
import type { EntityNameItem, EntityNameOptions } from "./entity_name_config";

const DEFAULT_SEPARATOR = " ";

export { DEFAULT_ENTITY_NAME, ENTITY_NAME_TYPES } from "./entity_name_config";
export type {
  EntityNameItem,
  EntityNameOptions,
  EntityNameType,
} from "./entity_name_config";

// Joins items that need no entity context. Returns undefined as soon as one
// item references the registries (device, area, ...).
const computeTextOnlyName = (
  items: EntityNameItem[],
  options?: EntityNameOptions
): string | undefined =>
  items.every((n) => n.type === "text")
    ? items
        .map((item) => item.text)
        .join(options?.separator ?? DEFAULT_SEPARATOR)
    : undefined;

/**
 * Name formatter used before the registry-aware one is installed
 * (see state/connection-mixin and state/state-display-mixin). It honours a
 * configured string or text-only name and falls back to the friendly name for
 * anything that needs entity context, so a configured name is never dropped
 * while the real formatter is still loading.
 */
export const computeEntityNameDisplayWithoutContext = (
  stateObj: HassEntity,
  name: string | EntityNameItem | EntityNameItem[] | undefined,
  options?: EntityNameOptions
): string => {
  if (typeof name === "string") {
    return name;
  }
  if (!name) {
    return computeStateName(stateObj);
  }
  return (
    computeTextOnlyName(ensureArray(name), options) ??
    computeStateName(stateObj)
  );
};

export const computeEntityNameDisplay = (
  stateObj: HassEntity,
  name: string | EntityNameItem | EntityNameItem[] | undefined,
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"],
  areas: HomeAssistant["areas"],
  floors: HomeAssistant["floors"],
  options?: EntityNameOptions
) => {
  if (typeof name === "string") {
    return name;
  }

  // If no name config is provided, fall back to the friendly name
  if (!name) {
    return computeStateName(stateObj);
  }

  let items = ensureArray(name);

  const separator = options?.separator ?? DEFAULT_SEPARATOR;

  // If all items are text, just join them
  const textOnlyName = computeTextOnlyName(items, options);
  if (textOnlyName !== undefined) {
    return textOnlyName;
  }

  const useDeviceName = entityUseDeviceName(stateObj, entities, devices);

  // If entity uses device name, and device is not already included, replace it with device name
  if (useDeviceName) {
    const hasDevice = items.some((n) => n.type === "device");
    if (!hasDevice) {
      items = items.map((n) => (n.type === "entity" ? { type: "device" } : n));
    }
  }

  const names = computeEntityNameList(
    stateObj,
    items,
    entities,
    devices,
    areas,
    floors
  );

  // If after processing there is only one name, return that
  if (names.length === 1) {
    return names[0] || "";
  }

  return names.filter((n) => n).join(separator);
};

export const computeEntityNameList = (
  stateObj: HassEntity,
  name: EntityNameItem[],
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"],
  areas: HomeAssistant["areas"],
  floors: HomeAssistant["floors"]
): (string | undefined)[] => {
  const entry = entities[stateObj.entity_id] as
    EntityRegistryDisplayEntry | undefined;

  if (!entry) {
    return name.map((item) =>
      item.type === "entity"
        ? computeStateName(stateObj)
        : item.type === "text"
          ? item.text
          : undefined
    );
  }

  return computeEntityEntryNameList(
    entry,
    name,
    entities,
    devices,
    areas,
    floors
  );
};

export const computeEntityEntryNameList = (
  entry: EntityRegistryDisplayEntry | EntityRegistryEntry,
  name: EntityNameItem[],
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"],
  areas: HomeAssistant["areas"],
  floors: HomeAssistant["floors"]
): (string | undefined)[] => {
  const { device, parentDevice, area, floor } = getEntityEntryContext(
    entry,
    entities,
    devices,
    areas,
    floors
  );

  return name.map((item) => {
    switch (item.type) {
      case "entity":
        return computeEntityEntryName(entry, devices);
      case "device":
        return device ? computeDeviceName(device) : undefined;
      case "parent_device":
        return parentDevice ? computeDeviceName(parentDevice) : undefined;
      case "area":
        return area ? computeAreaName(area) : undefined;
      case "floor":
        return floor ? computeFloorName(floor) : undefined;
      case "text":
        return item.text;
      default:
        return "";
    }
  });
};

export const computeEntitySearchLabels = (
  stateObj: HassEntity,
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"],
  areas: HomeAssistant["areas"],
  floors: HomeAssistant["floors"]
) => {
  const { device, parentDevice, area } = getEntityContext(
    stateObj,
    entities,
    devices,
    areas,
    floors
  );
  return {
    entityName: computeEntityName(stateObj, entities, devices) || null,
    friendlyName: computeStateName(stateObj) || null,
    deviceName: (device && computeDeviceName(device)) || null,
    parentDeviceName: (parentDevice && computeDeviceName(parentDevice)) || null,
    areaName: (area && computeAreaName(area)) || null,
  };
};

export interface EntityPickerDisplay {
  primary: string;
  secondary?: string;
}

export const computeEntityPickerDisplay = (
  hass: Pick<
    HomeAssistant,
    | "entities"
    | "devices"
    | "areas"
    | "floors"
    | "language"
    | "translationMetadata"
  >,
  stateObj: HassEntity
): EntityPickerDisplay => {
  const [entityName, deviceName, parentDeviceName, areaName] =
    computeEntityNameList(
      stateObj,
      [
        { type: "entity" },
        { type: "device" },
        { type: "parent_device" },
        { type: "area" },
      ],
      hass.entities,
      hass.devices,
      hass.areas,
      hass.floors
    );

  const isRTL = computeRTL(
    hass.language,
    hass.translationMetadata.translations
  );

  const primary = entityName || deviceName || stateObj.entity_id;
  const secondary =
    [areaName, parentDeviceName, entityName ? deviceName : undefined]
      .filter(Boolean)
      .join(isRTL ? " ◂ " : " ▸ ") || undefined;

  return { primary, secondary };
};
