import type { HassEntity } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../../types";
import { ensureArray } from "../array/ensure-array";
import { computeDomain } from "./compute_domain";
import { getEntityContext } from "./context/get_entity_context";

type EntityCategory = "none" | "config" | "diagnostic";

export interface EntityFilter {
  domain?: string | string[];
  device_class?: string | string[];
  device?: string | string[];
  area?: string | string[];
  floor?: string | string[];
  label?: string | string[];
  entity_category?: EntityCategory | EntityCategory[];
  hidden_platform?: string | string[];
}

export type EntityFilterFunc = (entityId: string) => boolean;

export const generateEntityFilter = (
  hass: HomeAssistant,
  filter: EntityFilter
): EntityFilterFunc => {
  const domains = filter.domain
    ? new Set(ensureArray(filter.domain))
    : undefined;
  const deviceClasses = filter.device_class
    ? new Set(ensureArray(filter.device_class))
    : undefined;
  const floors = filter.floor ? new Set(ensureArray(filter.floor)) : undefined;
  const areas = filter.area ? new Set(ensureArray(filter.area)) : undefined;
  const devices = filter.device
    ? new Set(ensureArray(filter.device))
    : undefined;
  const entityCategories = filter.entity_category
    ? new Set(ensureArray(filter.entity_category))
    : undefined;
  const labels = filter.label ? new Set(ensureArray(filter.label)) : undefined;
  const hiddenPlatforms = filter.hidden_platform
    ? new Set(ensureArray(filter.hidden_platform))
    : undefined;

  return (entityId: string) => {
    const stateObj = hass.states[entityId] as HassEntity | undefined;
    if (!stateObj) {
      return false;
    }
    if (domains) {
      const domain = computeDomain(entityId);
      if (!domains.has(domain)) {
        return false;
      }
    }
    if (deviceClasses) {
      const dc = stateObj.attributes.device_class || "none";
      if (!deviceClasses.has(dc)) {
        return false;
      }
    }

    const { area, floor, device, entity } = getEntityContext(
      stateObj,
      hass.entities,
      hass.devices,
      hass.areas,
      hass.floors
    );

    if (entity && entity.hidden) {
      return false;
    }

    if (floors) {
      if (!floor || !floors.has(floor.floor_id)) {
        return false;
      }
    }
    if (areas) {
      if (!area) {
        return false;
      }
      if (!areas.has(area.area_id)) {
        return false;
      }
    }
    if (devices) {
      if (!device) {
        return false;
      }
      if (!devices.has(device.id)) {
        return false;
      }
    }
    if (labels) {
      if (!entity) {
        return false;
      }
      if (!entity.labels.some((label) => labels.has(label))) {
        return false;
      }
    }
    if (entityCategories) {
      if (!entity) {
        return false;
      }
      const category = entity?.entity_category || "none";
      if (!entityCategories.has(category)) {
        return false;
      }
    }
    if (hiddenPlatforms) {
      if (!entity) {
        return false;
      }
      if (entity.platform && hiddenPlatforms.has(entity.platform)) {
        return false;
      }
    }

    return true;
  };
};
