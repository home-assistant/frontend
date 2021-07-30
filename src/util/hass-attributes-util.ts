import { html, TemplateResult } from "lit";
import { until } from "lit/directives/until";
import checkValidDate from "../common/datetime/check_valid_date";
import { formatDate } from "../common/datetime/format_date";
import { formatDateTimeWithSeconds } from "../common/datetime/format_date_time";
import { isDate } from "../common/string/is_date";
import { isTimestamp } from "../common/string/is_timestamp";
import { HomeAssistant } from "../types";

let jsYamlPromise: Promise<typeof import("../resources/js-yaml-dump")>;

const hassAttributeUtil = {
  DOMAIN_DEVICE_CLASS: {
    binary_sensor: [
      "battery",
      "cold",
      "connectivity",
      "door",
      "garage_door",
      "gas",
      "heat",
      "light",
      "lock",
      "moisture",
      "motion",
      "moving",
      "occupancy",
      "opening",
      "plug",
      "power",
      "presence",
      "problem",
      "safety",
      "smoke",
      "sound",
      "vibration",
      "window",
    ],
    cover: [
      "awning",
      "blind",
      "curtain",
      "damper",
      "door",
      "garage",
      "gate",
      "shade",
      "shutter",
      "window",
    ],
    humidifier: ["dehumidifier", "humidifier"],
    sensor: [
      "battery",
      "carbon_dioxide",
      "carbon_monoxide",
      "current",
      "energy",
      "humidity",
      "illuminance",
      "power",
      "power_factor",
      "pressure",
      "monetary",
      "signal_strength",
      "temperature",
      "timestamp",
      "voltage",
    ],
    switch: ["switch", "outlet"],
  },
  UNKNOWN_TYPE: "json",
  ADD_TYPE: "key-value",
  TYPE_TO_TAG: {
    string: "ha-customize-string",
    json: "ha-customize-string",
    icon: "ha-customize-icon",
    boolean: "ha-customize-boolean",
    array: "ha-customize-array",
    "key-value": "ha-customize-key-value",
  },
  LOGIC_STATE_ATTRIBUTES: {},
};

// Attributes here serve dual purpose:
// 1) Any key of this object won't be shown in more-info window.
// 2) Any key which has value other than undefined will appear in customization
//    config according to its value.
hassAttributeUtil.LOGIC_STATE_ATTRIBUTES = {
  entity_picture: undefined,
  friendly_name: { type: "string", description: "Name" },
  icon: { type: "icon" },
  emulated_hue: {
    type: "boolean",
    domains: ["emulated_hue"],
  },
  emulated_hue_name: {
    type: "string",
    domains: ["emulated_hue"],
  },
  haaska_hidden: undefined,
  haaska_name: undefined,
  supported_features: undefined,
  attribution: undefined,
  restored: undefined,
  editable: undefined,
  custom_ui_more_info: { type: "string" },
  custom_ui_state_card: { type: "string" },
  device_class: {
    type: "array",
    options: hassAttributeUtil.DOMAIN_DEVICE_CLASS,
    description: "Device class",
    domains: ["binary_sensor", "cover", "humidifier", "sensor", "switch"],
  },
  state_class: {
    type: "array",
    options: { sensor: ["measurement"] },
    description: "State class",
    domains: ["sensor"],
  },
  last_reset: undefined,
  assumed_state: {
    type: "boolean",
    domains: [
      "switch",
      "light",
      "cover",
      "climate",
      "fan",
      "humidifier",
      "group",
      "water_heater",
    ],
  },
  initial_state: {
    type: "string",
    domains: ["automation"],
  },
  unit_of_measurement: { type: "string" },
};

export default hassAttributeUtil;

// Convert from internal snake_case format to user-friendly format
export function formatAttributeName(value: string): string {
  value = value
    .replace(/_/g, " ")
    .replace(/\bid\b/g, "ID")
    .replace(/\bip\b/g, "IP")
    .replace(/\bmac\b/g, "MAC")
    .replace(/\bgps\b/g, "GPS");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatAttributeValue(
  hass: HomeAssistant,
  value: any
): string | TemplateResult {
  if (value === null) {
    return "-";
  }

  // YAML handling
  if (
    (Array.isArray(value) && value.some((val) => val instanceof Object)) ||
    (!Array.isArray(value) && value instanceof Object)
  ) {
    if (!jsYamlPromise) {
      jsYamlPromise = import("../resources/js-yaml-dump");
    }
    const yaml = jsYamlPromise.then((jsYaml) => jsYaml.dump(value));
    return html`<pre>${until(yaml, "")}</pre>`;
  }

  if (typeof value === "string") {
    // URL handling
    if (value.startsWith("http")) {
      try {
        // If invalid URL, exception will be raised
        const url = new URL(value);
        if (url.protocol === "http:" || url.protocol === "https:")
          return html`<a target="_blank" rel="noreferrer" href="${value}"
            >${value}</a
          >`;
      } catch (_) {
        // Nothing to do here
      }
    }

    // Date handling
    if (isDate(value, true)) {
      // Timestamp handling
      if (isTimestamp(value)) {
        const date = new Date(value);
        if (checkValidDate(date)) {
          return formatDateTimeWithSeconds(date, hass.locale);
        }
      }

      // Value was not a timestamp, so only do date formatting
      const date = new Date(value);
      if (checkValidDate(date)) {
        return formatDate(date, hass.locale);
      }
    }
  }

  return Array.isArray(value) ? value.join(", ") : value;
}
