import { ensureArray } from "../common/array/ensure-array";
import { computeAreaName } from "../common/entity/compute_area_name";
import { computeDeviceName } from "../common/entity/compute_device_name";
import { computeEntityName } from "../common/entity/compute_entity_name";
import { getEntityContext } from "../common/entity/context/get_entity_context";
import { blankBeforeUnit } from "../common/translations/blank_before_unit";
import type { HomeAssistant } from "../types";
import type { Selector } from "./selector";

export const computeSelectorLabel = (
  hass: HomeAssistant,
  value: any,
  selector?: Selector
) => {
  if (value == null) {
    return "";
  }

  if (!selector) {
    return ensureArray(value).join(", ");
  }

  if ("text" in selector) {
    const { prefix, suffix } = selector.text!;

    const texts = ensureArray(value);
    return texts
      .map((text) => `${prefix || ""}${text}${suffix || ""}`)
      .join(", ");
  }

  if ("number" in selector) {
    const { unit_of_measurement } = selector.number!;
    const numbers = ensureArray(value);
    return numbers
      .map((number) => {
        const num = Number(number);
        if (isNaN(num)) {
          return number;
        }
        return unit_of_measurement
          ? `${num}${blankBeforeUnit(unit_of_measurement, hass.locale)}${unit_of_measurement}`
          : num.toString();
      })
      .join(", ");
  }

  if ("floor" in selector) {
    const floors = ensureArray(value);
    return floors
      .map((floorId) => {
        const floor = hass.floors[floorId];
        if (!floor) {
          return floorId;
        }
        return floor.name || floorId;
      })
      .join(", ");
  }

  if ("area" in selector) {
    const areas = ensureArray(value);
    return areas
      .map((areaId) => {
        const area = hass.areas[areaId];
        if (!area) {
          return areaId;
        }
        return computeAreaName(area);
      })
      .join(", ");
  }

  if ("entity" in selector) {
    const entities = ensureArray(value);
    return entities
      .map((entityId) => {
        const stateObj = hass.states[entityId];
        if (!stateObj) {
          return entityId;
        }
        const { device } = getEntityContext(stateObj, hass);
        const deviceName = device ? computeDeviceName(device) : undefined;
        const entityName = computeEntityName(stateObj, hass);
        return [deviceName, entityName].filter(Boolean).join(" ") || entityId;
      })
      .join(", ");
  }

  if ("device" in selector) {
    const devices = ensureArray(value);
    return devices
      .map((deviceId) => {
        const device = hass.devices[deviceId];
        if (!device) {
          return deviceId;
        }
        return device.name || deviceId;
      })
      .join(", ");
  }

  return ensureArray(value).join(", ");
};
