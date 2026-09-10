import { ensureArray } from "../../common/array/ensure-array";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { durationValueToData } from "../../common/datetime/duration_value_to_data";
import { formatDurationLong } from "../../common/datetime/format_duration";
import { DEFAULT_ENTITY_NAME } from "../../common/entity/compute_entity_name_display";
import { blankBeforeUnit } from "../../common/translations/blank_before_unit";
import type { HomeAssistant } from "../../types";
import type { OffsetSelectorValue, Selector } from "../selector";

export const formatSelectorValue = (
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
    const { prefix, suffix, type } = selector.text || {};

    const texts = ensureArray(value);

    // Never reveal secret values in a read-only preview.
    if (type === "password") {
      return texts.map(() => "••••••••").join(", ");
    }

    return texts
      .map((text) => `${prefix || ""}${text}${suffix || ""}`)
      .join(", ");
  }

  if ("number" in selector) {
    const { unit_of_measurement } = selector.number || {};
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
        const name = hass.formatEntityName(stateObj, DEFAULT_ENTITY_NAME);
        return name || entityId;
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

  if ("object" in selector) {
    const { fields } = selector.object ?? {};
    const items = ensureArray(value);
    return items
      .map((item) => {
        if (item == null || typeof item !== "object") {
          return String(item);
        }
        if (fields) {
          return Object.entries(fields)
            .filter(([key]) => key in item && item[key] != null)
            .map(([key, field]) =>
              formatSelectorValue(hass, item[key], field.selector)
            )
            .join(" = ");
        }
        return JSON.stringify(item);
      })
      .join(", ");
  }

  if ("offset" in selector) {
    const { type, duration } = value as OffsetSelectorValue;
    const durationData = durationValueToData(duration);
    if (type === "none" || !durationData) {
      return "";
    }
    const formattedDuration = formatDurationLong(hass.locale, durationData);
    if (!formattedDuration) {
      return "";
    }
    return hass.localize(`ui.components.selectors.offset.summary.${type}`, {
      duration: formattedDuration,
    });
  }

  return ensureArray(value)
    .map((v) =>
      v != null && typeof v === "object" ? JSON.stringify(v) : String(v)
    )
    .join(", ");
};
