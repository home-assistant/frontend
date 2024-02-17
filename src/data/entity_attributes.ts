import { formatDuration } from "../common/datetime/duration";
import { FrontendLocaleData } from "./translation";

export const STATE_ATTRIBUTES = [
  "entity_id",
  "assumed_state",
  "attribution",
  "custom_ui_more_info",
  "custom_ui_state_card",
  "device_class",
  "editable",
  "emulated_hue_name",
  "emulated_hue",
  "entity_picture",
  "event_types",
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

export const TEMPERATURE_ATTRIBUTES = new Set([
  "temperature",
  "current_temperature",
  "target_temperature",
  "target_temp_temp",
  "target_temp_high",
  "target_temp_low",
  "target_temp_step",
  "min_temp",
  "max_temp",
]);

export const DOMAIN_ATTRIBUTES_UNITS = {
  climate: {
    humidity: "%",
    current_humidity: "%",
    target_humidity_low: "%",
    target_humidity_high: "%",
    target_humidity_step: "%",
    min_humidity: "%",
    max_humidity: "%",
  },
  cover: {
    current_position: "%",
    current_tilt_position: "%",
  },
  fan: {
    percentage: "%",
  },
  humidifier: {
    humidity: "%",
    current_humidity: "%",
    min_humidity: "%",
    max_humidity: "%",
  },
  light: {
    color_temp: "mired",
    max_mireds: "mired",
    min_mireds: "mired",
    color_temp_kelvin: "K",
    min_color_temp_kelvin: "K",
    max_color_temp_kelvin: "K",
    brightness: "%",
  },
  sun: {
    elevation: "°",
  },
  vacuum: {
    battery_level: "%",
  },
  valve: {
    current_position: "%",
  },
  sensor: {
    battery_level: "%",
  },
  media_player: {
    volume_level: "%",
  },
} as const satisfies Record<string, Record<string, string>>;

type Formatter = (value: number, locale: FrontendLocaleData) => string;

export const DOMAIN_ATTRIBUTES_FORMATERS: Record<
  string,
  Record<string, Formatter>
> = {
  light: {
    brightness: (value) => Math.round((value / 255) * 100).toString(),
  },
  media_player: {
    volume_level: (value) => Math.round(value * 100).toString(),
    media_duration: (value) => formatDuration(value.toString(), "s"),
  },
};
