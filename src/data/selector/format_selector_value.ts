import { ensureArray } from "../../common/array/ensure-array";
import { createDurationData } from "../../common/datetime/create_duration_data";
import { formatDurationLong } from "../../common/datetime/format_duration";
import { normalizeDuration } from "../../common/datetime/normalize_duration";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { DEFAULT_ENTITY_NAME } from "../../common/entity/compute_entity_name_display";
import { blankBeforeUnit } from "../../common/translations/blank_before_unit";
import type { HomeAssistant } from "../../types";
import type { Selector } from "../selector";
import { getDurationSelectorMode, getDurationSelectorUnits } from "../selector";

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

  if ("media" in selector) {
    const media = ensureArray(value);
    return media
      .map((item) => item.metadata?.title || item.media_content_id)
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

  if ("duration" in selector) {
    const data = createDurationData(value);
    if (!data) {
      return "";
    }
    const { negative, duration } = normalizeDuration(
      data,
      getDurationSelectorUnits(selector.duration)
    );
    const formatted = formatDurationLong(hass.locale, duration);
    const mode = getDurationSelectorMode(selector.duration);
    if (!formatted || mode === "positive") {
      return formatted;
    }
    const sign = negative ? "negative" : "positive";
    return hass.localize(
      `ui.components.selectors.duration.summary.${mode}_${sign}`,
      { duration: formatted }
    );
  }

  return ensureArray(value)
    .map((v) =>
      v != null && typeof v === "object" ? JSON.stringify(v) : String(v)
    )
    .join(", ");
};
