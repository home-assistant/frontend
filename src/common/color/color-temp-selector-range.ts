import type { HassEntities } from "home-assistant-js-websocket";
import { hasTemplate } from "../string/has-template";
import {
  resolveEntityIDs,
  type Selector,
  type TargetSelector,
} from "../../data/selector";
import { getServiceCallEntityIds } from "../../data/service";
import type { HassServiceTargetWithExclude } from "../../data/target";
import type { HomeAssistant } from "../../types";

interface KelvinColorTempConfig {
  unit?: "kelvin" | "mired";
  min?: number;
  max?: number;
  min_mireds?: number;
  max_mireds?: number;
}

const kelvinColorTempConfig = (
  selector: Selector
): KelvinColorTempConfig | undefined => {
  if (!("color_temp" in selector) || selector.color_temp == null) {
    return undefined;
  }
  if (selector.color_temp.unit !== "kelvin") {
    return undefined;
  }
  return selector.color_temp;
};

const finiteRange = (
  min: unknown,
  max: unknown
): { min: number; max: number } | undefined => {
  if (typeof min !== "number" || typeof max !== "number") {
    return undefined;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    return undefined;
  }
  return { min, max };
};

/**
 * Narrow a Kelvin color-temperature selector to the range targeted lights
 * can produce. The light service schema ships one generic slider for every
 * light. A device may declare a different range on its state.
 *
 * Several lights use the overlap of their ranges, because one
 * `color_temp_kelvin` value is sent to every target. When the ranges do not
 * overlap, the slider spans the widest range so it still has a valid min
 * and max. Lights without a reported range are ignored. The original
 * selector is returned when nothing narrows it.
 */
export const colorTempSelectorForTargets = (
  selector: Selector,
  states: HassEntities,
  targetEntities: readonly string[] | null
): Selector => {
  const config = kelvinColorTempConfig(selector);
  if (!config || !targetEntities?.length) {
    return selector;
  }

  const ranges: { min: number; max: number }[] = [];
  for (const entityId of targetEntities) {
    const attributes = states[entityId]?.attributes;
    const range = finiteRange(
      attributes?.min_color_temp_kelvin,
      attributes?.max_color_temp_kelvin
    );
    if (range) {
      ranges.push(range);
    }
  }
  if (!ranges.length) {
    return selector;
  }

  let min = Math.max(...ranges.map((range) => range.min));
  let max = Math.min(...ranges.map((range) => range.max));
  if (min > max) {
    min = Math.min(...ranges.map((range) => range.min));
    max = Math.max(...ranges.map((range) => range.max));
  }

  if (config.min === min && config.max === max) {
    return selector;
  }

  return {
    color_temp: {
      ...config,
      min,
      max,
    },
  };
};

const LIGHT_COLOR_TEMP_FIELD = "color_temp_kelvin";

type ColorTempHass = Pick<
  HomeAssistant,
  "states" | "entities" | "devices" | "areas"
>;

export interface ServiceColorTempValue {
  target?: HassServiceTargetWithExclude;
  data?: Record<string, unknown>;
}

const targetId = (
  fromTarget: string | string[] | undefined,
  fromData: unknown
): string | string[] | undefined => {
  if (fromTarget) {
    return fromTarget;
  }
  if (typeof fromData === "string") {
    return fromData;
  }
  if (
    Array.isArray(fromData) &&
    fromData.every((item) => typeof item === "string")
  ) {
    return fromData;
  }
  return undefined;
};

const isPrimaryEntity = (hass: ColorTempHass, entityId: string): boolean => {
  const entity = hass.entities[entityId];
  return !entity?.entity_category && !entity?.hidden;
};

/**
 * Entities a light action will actually call. Area targets skip a device
 * entity that is assigned to another area. Hidden and categorized lights
 * reached only through a device, area, floor, or label are left out, matching
 * service calls. An explicitly chosen entity is kept. A template target cannot
 * be resolved, so the caller keeps the original selector.
 */
const colorTempTargetEntityIds = (
  hass: ColorTempHass,
  value: ServiceColorTempValue | undefined,
  serviceTarget?: TargetSelector["target"]
): string[] | null => {
  const data = value?.data;
  if (
    hasTemplate(value?.target) ||
    hasTemplate(data?.entity_id) ||
    hasTemplate(data?.device_id) ||
    hasTemplate(data?.area_id) ||
    hasTemplate(data?.floor_id) ||
    hasTemplate(data?.label_id)
  ) {
    return null;
  }

  const explicitEntityIds = getServiceCallEntityIds(
    { entity_id: data?.entity_id },
    value?.target
  );
  const explicit = new Set(explicitEntityIds);
  const resolved = resolveEntityIDs(
    hass,
    {
      entity_id: explicitEntityIds,
      device_id: targetId(value?.target?.device_id, data?.device_id),
      area_id: targetId(value?.target?.area_id, data?.area_id),
      floor_id: targetId(value?.target?.floor_id, data?.floor_id),
      label_id: targetId(value?.target?.label_id, data?.label_id),
      exclude: value?.target?.exclude,
    },
    hass.entities,
    hass.devices,
    hass.areas,
    serviceTarget ? { target: serviceTarget } : { target: {} }
  );

  return resolved.filter(
    (entityId) => explicit.has(entityId) || isPrimaryEntity(hass, entityId)
  );
};

/**
 * Adjust only the light service color-temperature field. Other Kelvin
 * selectors, including a script field with its own bounds, stay as authored.
 */
export const colorTempSelectorForServiceField = (
  domain: string | undefined,
  fieldKey: string,
  selector: Selector,
  hass: ColorTempHass,
  value: ServiceColorTempValue | undefined,
  serviceTarget?: TargetSelector["target"]
): Selector => {
  if (domain !== "light" || fieldKey !== LIGHT_COLOR_TEMP_FIELD) {
    return selector;
  }
  return colorTempSelectorForTargets(
    selector,
    hass.states,
    colorTempTargetEntityIds(hass, value, serviceTarget)
  );
};
