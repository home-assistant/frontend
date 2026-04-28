import type { HassEntity } from "home-assistant-js-websocket";
import { isUnavailableState } from "../../data/entity/entity";
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
  let unit;
  if (
    stateObj &&
    !isUnavailableState(stateObj.state) &&
    (config.attribute || stateObj?.attributes.device_class !== "duration")
  ) {
    // check for an explicitly defined unit in config
    unit = config.unit;

    if (!unit) {
      if (!config.attribute) {
        // use entity's unit_of_measurement
        const stateParts = hass.formatEntityStateToParts(stateObj);
        unit = stateParts.find((part) => part.type === "unit")?.value;
      } else {
        // use attribute's unit if available
        const attrParts = hass.formatEntityAttributeValueToParts(
          stateObj,
          config.attribute
        );
        unit = attrParts.find((part) => part.type === "unit")?.value;
      }
    }

    return unit;
  }

  return "";
};
