import type { HassEntity } from "home-assistant-js-websocket";
import type {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
} from "../../data/entity/entity_registry";
import type { HomeAssistant, HomeAssistantRegistries } from "../../types";
import { ensureArray } from "../array/ensure-array";
import { computeRTL } from "../util/compute_rtl";
import { computeAreaName } from "./compute_area_name";
import { computeDeviceName } from "./compute_device_name";
import { computeFloorName } from "./compute_floor_name";
import { computeStateName } from "./compute_state_name";
import { getEntityEntryContext } from "./context/get_entity_context";
import {
  DEFAULT_ENTITY_NAME,
  type EntityNameItem,
  type EntityNameOptions,
  type EntityNameType,
} from "./entity_name_config";

const DEFAULT_SEPARATOR = " ";

export { DEFAULT_ENTITY_NAME, ENTITY_NAME_TYPES } from "./entity_name_config";
export type {
  EntityNameItem,
  EntityNameOptions,
  EntityNameType,
} from "./entity_name_config";

export type EntityNameParts = Partial<Record<EntityNameType, string>>;

export interface EntityNamePartsOptions {
  followContext?: boolean;
}

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
  name?: string | EntityNameItem | EntityNameItem[],
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

export const computeEntityEntryName = (
  entry: EntityRegistryDisplayEntry | EntityRegistryEntry
): string | undefined => {
  const name =
    entry.name ??
    ("original_name" in entry && entry.original_name != null
      ? String(entry.original_name)
      : undefined);
  return name || undefined;
};

export const computeEntityEntryNameParts = (
  entry: EntityRegistryDisplayEntry | EntityRegistryEntry,
  registries: HomeAssistantRegistries,
  options?: EntityNamePartsOptions
): EntityNameParts => {
  const { device, parentDevice, area, floor } = getEntityEntryContext(
    entry,
    registries.entities,
    registries.devices,
    registries.areas,
    registries.floors
  );
  const entityName = computeEntityEntryName(entry);
  const followContext = options?.followContext ?? true;

  // Same rule as the backend: an owner only adds its name part while the
  // next_name_part links reach it, so owners above the first node with its own
  // area are left out. An entity without a name of its own is still named
  // after its device.
  const nameDevice =
    !followContext || entry.next_name_part === "device" || !entityName
      ? device
      : null;
  const nameParentDevice =
    !followContext ||
    (entry.next_name_part === "device" &&
      device?.next_name_part === "parent_device")
      ? parentDevice
      : null;

  return {
    entity: entityName,
    device: nameDevice ? computeDeviceName(nameDevice) : undefined,
    parent_device: nameParentDevice
      ? computeDeviceName(nameParentDevice)
      : undefined,
    area: area ? computeAreaName(area) : undefined,
    floor: floor ? computeFloorName(floor) : undefined,
  };
};

export const computeEntityNameParts = (
  stateObj: HassEntity,
  registries: HomeAssistantRegistries,
  options?: EntityNamePartsOptions
): EntityNameParts => {
  const entry = registries.entities[stateObj.entity_id] as
    EntityRegistryDisplayEntry | undefined;

  if (!entry) {
    return { entity: computeStateName(stateObj) };
  }
  return computeEntityEntryNameParts(entry, registries, options);
};

export const computeDefaultEntityNameItems = (
  stateObj: HassEntity,
  registries: HomeAssistantRegistries
): EntityNameItem[] => {
  const parts = computeEntityNameParts(stateObj, registries);
  return DEFAULT_ENTITY_NAME.filter((item) => parts[item.type]);
};

export const computeEntityNameDisplay = (
  stateObj: HassEntity,
  name: string | EntityNameItem | EntityNameItem[] | undefined,
  registries: HomeAssistantRegistries,
  options?: EntityNameOptions
): string => {
  if (typeof name === "string") {
    return name;
  }

  const separator = options?.separator ?? DEFAULT_SEPARATOR;

  if (!name) {
    const parts = computeEntityNameParts(stateObj, registries);
    return (
      DEFAULT_ENTITY_NAME.map((item) => parts[item.type])
        .filter((n) => n)
        .join(separator) || computeStateName(stateObj)
    );
  }

  const items = ensureArray(name);

  const textOnlyName = computeTextOnlyName(items, options);
  if (textOnlyName !== undefined) {
    return textOnlyName;
  }

  const parts = computeEntityNameParts(stateObj, registries, {
    followContext: false,
  });

  // An entity without a name of its own is named after its device, unless the
  // device is already part of the name
  const useDeviceName =
    !parts.entity && !items.some((item) => item.type === "device");

  return items
    .map((item) =>
      item.type === "text"
        ? item.text
        : parts[item.type === "entity" && useDeviceName ? "device" : item.type]
    )
    .filter((n) => n)
    .join(separator);
};

export const computeEntitySearchLabels = (
  stateObj: HassEntity,
  registries: HomeAssistantRegistries
) => {
  const parts = computeEntityNameParts(stateObj, registries, {
    followContext: false,
  });
  return {
    entityName: parts.entity || null,
    friendlyName: computeStateName(stateObj) || null,
    deviceName: parts.device || null,
    parentDeviceName: parts.parent_device || null,
    areaName: parts.area || null,
  };
};

export interface EntityPickerDisplay {
  primary: string;
  secondary?: string;
}

export const computeEntityPickerDisplay = (
  hass: HomeAssistantRegistries &
    Pick<HomeAssistant, "language" | "translationMetadata">,
  stateObj: HassEntity
): EntityPickerDisplay => {
  const parts = computeEntityNameParts(stateObj, hass);

  const isRTL = computeRTL(
    hass.language,
    hass.translationMetadata.translations
  );

  const primary = parts.entity || parts.device || stateObj.entity_id;
  const secondary =
    [parts.area, parts.parent_device, parts.entity ? parts.device : undefined]
      .filter(Boolean)
      .join(isRTL ? " ◂ " : " ▸ ") || undefined;

  return { primary, secondary };
};
