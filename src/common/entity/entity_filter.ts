import type { HassEntity } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../../types";
import { ensureArray } from "../array/ensure-array";
import { computeDomain } from "./compute_domain";
import { getEntityContext } from "./context/get_entity_context";

type EntityCategory = "none" | "config" | "diagnostic";

export interface EntityFilter {
  domain?: string | string[];
  device_class?: string | string[];
  device?: string | null | (string | null)[];
  area?: string | null | (string | null)[];
  floor?: string | null | (string | null)[];
  label?: string | string[];
  entity_category?: EntityCategory | EntityCategory[];
  hidden_platform?: string | string[];
  hidden_domains?: string | string[];
}

export type EntityFilterFunc = (entityId: string) => boolean;

const normalizeFilterArray = <T>(
  value: T | null | T[] | (T | null)[] | undefined
): Set<T | null> | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return new Set([null]);
  }
  return new Set(ensureArray(value));
};

export const generateEntityFilter = (
  hass: HomeAssistant,
  filter: EntityFilter
): EntityFilterFunc => {
  const domains = filter.domain
    ? new Set(ensureArray(filter.domain))
    : undefined;
  const hiddenDomains = filter.hidden_domains
    ? new Set(ensureArray(filter.hidden_domains))
    : undefined;
  const deviceClasses = filter.device_class
    ? new Set(ensureArray(filter.device_class))
    : undefined;
  const floors = normalizeFilterArray(filter.floor);
  const areas = normalizeFilterArray(filter.area);
  const devices = normalizeFilterArray(filter.device);
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
    if (domains || hiddenDomains) {
      const domain = computeDomain(entityId);
      if (domains && !domains.has(domain)) {
        return false;
      }
      if (hiddenDomains && hiddenDomains.has(domain)) {
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
      const floorId = floor?.floor_id ?? null;
      if (!floors.has(floorId)) {
        return false;
      }
    }
    if (areas) {
      const areaId = area?.area_id ?? null;
      if (!areas.has(areaId)) {
        return false;
      }
    }
    if (devices) {
      const deviceId = device?.id ?? null;
      if (!devices.has(deviceId)) {
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

export const findEntities = (
  entities: string[],
  filters: EntityFilterFunc[]
): string[] => {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const filter of filters) {
    for (const entity of entities) {
      if (filter(entity) && !seen.has(entity)) {
        seen.add(entity);
        results.push(entity);
      }
    }
  }

  return results;
};
