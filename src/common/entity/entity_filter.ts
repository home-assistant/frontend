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

type EntityFilterFunc = (entityId: string) => boolean;

export const generateEntityFilter = (
  hass: HomeAssistant,
  filter: EntityFilter
): EntityFilterFunc => {
  const domains = new Set(ensureArray(filter.domain) ?? []);
  const deviceClasses = new Set(ensureArray(filter.device_class) ?? []);
  const floors = new Set(ensureArray(filter.floor) ?? []);
  const areas = new Set(ensureArray(filter.area) ?? []);
  const devices = new Set(ensureArray(filter.device) ?? []);
  const entityCategories = new Set(ensureArray(filter.entity_category) ?? []);
  const labels = new Set(ensureArray(filter.label) ?? []);
  const hiddenPlatforms = new Set(ensureArray(filter.hidden_platform) ?? []);

  return (entityId: string) => {
    const stateObj = hass.states[entityId] as HassEntity | undefined;
    if (!stateObj) {
      return false;
    }
    if (domains.size > 0) {
      const domain = computeDomain(entityId);
      if (!domains.has(domain)) {
        return false;
      }
    }
    if (deviceClasses.size > 0) {
      const dc = stateObj.attributes.device_class;
      if (!dc) {
        return false;
      }
      if (!deviceClasses.has(dc)) {
        return false;
      }
    }

    const { area, floor, device, entity } = getEntityContext(stateObj, hass);

    if (entity && entity.hidden) {
      return false;
    }

    if (floors.size > 0) {
      if (!floor) {
        return false;
      }
      if (!floors.has(floor.floor_id)) {
        return false;
      }
    }
    if (areas.size > 0) {
      if (!area) {
        return false;
      }
      if (!areas.has(area.area_id)) {
        return false;
      }
    }
    if (devices.size > 0) {
      if (!device) {
        return false;
      }
      if (!devices.has(device.id)) {
        return false;
      }
    }
    if (labels.size > 0) {
      if (!entity) {
        return false;
      }
      if (!entity.labels.some((label) => labels.has(label))) {
        return false;
      }
    }
    if (entityCategories.size > 0) {
      if (!entity) {
        return false;
      }
      const category = entity?.entity_category || "none";
      if (!entityCategories.has(category)) {
        return false;
      }
    }
    if (hiddenPlatforms.size > 0) {
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
