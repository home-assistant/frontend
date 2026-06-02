import type { HassEntity } from "home-assistant-js-websocket";
import { UNAVAILABLE, UNKNOWN } from "../../data/entity/entity";
import type { HomeAssistant } from "../../types";

interface EntityUnitStubConfig {
  entity: string;
  attribute?: string;
  unit?: string;
}

/**
 * Computes the display unit for an entity.
 *
 * @param hass - Home Assistant instance
 * @param stateObj - Entity state object
 * @param config - Element configuration
 * @returns Computed entity unit
 */
export const computeEntityUnitDisplay = (
  hass: HomeAssistant,
  stateObj: HassEntity | undefined,
  config: EntityUnitStubConfig
): string => {
  if (
    !stateObj ||
    stateObj.state === UNAVAILABLE ||
    stateObj.state === UNKNOWN ||
    (!config.attribute && stateObj.attributes.device_class === "duration")
  ) {
    return "";
  }

  // check for an explicitly defined unit in config
  if (config.unit) {
    return config.unit;
  }

  // otherwise derive from the entity's state or attribute
  const parts = config.attribute
    ? hass.formatEntityAttributeValueToParts(stateObj, config.attribute)
    : hass.formatEntityStateToParts(stateObj);

  return parts.find((part) => part.type === "unit")?.value ?? "";
};
