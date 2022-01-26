import { html, TemplateResult } from "lit";
import { until } from "lit/directives/until";
import checkValidDate from "../common/datetime/check_valid_date";
import { formatDate } from "../common/datetime/format_date";
import { formatDateTimeWithSeconds } from "../common/datetime/format_date_time";
import { formatNumber } from "../common/number/format_number";
import { capitalizeFirstLetter } from "../common/string/capitalize-first-letter";
import { isDate } from "../common/string/is_date";
import { isTimestamp } from "../common/string/is_timestamp";
import { HomeAssistant } from "../types";

let jsYamlPromise: Promise<typeof import("../resources/js-yaml-dump")>;

export const STATE_ATTRIBUTES = [
  "assumed_state",
  "attribution",
  "custom_ui_more_info",
  "custom_ui_state_card",
  "device_class",
  "editable",
  "emulated_hue_name",
  "emulated_hue",
  "entity_picture",
  "friendly_name",
  "haaska_hidden",
  "haaska_name",
  "icon",
  "initial_state",
  "last_reset",
  "restored",
  "state_class",
  "supported_features",
  "unit_of_measurement",
];

// Convert from internal snake_case format to user-friendly format
export function formatAttributeName(value: string): string {
  value = value
    .replace(/_/g, " ")
    .replace(/\bid\b/g, "ID")
    .replace(/\bip\b/g, "IP")
    .replace(/\bmac\b/g, "MAC")
    .replace(/\bgps\b/g, "GPS");
  return capitalizeFirstLetter(value);
}

export function formatAttributeValue(
  hass: HomeAssistant,
  value: any
): string | TemplateResult {
  if (value === null) {
    return "—";
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

  if (typeof value === "number") {
    return formatNumber(value, hass.locale);
  }

  if (typeof value === "string") {
    // URL handling
    if (value.startsWith("http")) {
      try {
        // If invalid URL, exception will be raised
        const url = new URL(value);
        if (url.protocol === "http:" || url.protocol === "https:")
          return html`<a target="_blank" rel="noreferrer" href=${value}
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
