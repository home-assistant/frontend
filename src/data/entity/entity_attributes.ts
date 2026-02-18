import type { HassEntity } from "home-assistant-js-websocket";
import { formatDurationDigital } from "../../common/datetime/format_duration";
import type { FrontendLocaleData } from "../translation";
import { computeStateDomain } from "../../common/entity/compute_state_domain";

// These attributes are hidden from the more-info window for all entities.
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
  "available_tones",
];

// These attributes are hidden from the more-info window for entities of the
// matching domain and device_class.
export const STATE_ATTRIBUTES_DOMAIN_CLASS = {
  sensor: {
    enum: ["options"],
  },
};

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
    target_humidity_step: "%",
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
    azimuth: "°",
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
    media_duration: (value, locale) => {
      const hours = Math.floor(value / 3600);
      const minutes = Math.floor((value % 3600) / 60);
      const seconds = value % 60;
      return formatDurationDigital(locale, { hours, minutes, seconds })!;
    },
  },
  input_datetime: {
    year: (value) => value.toString(),
  },
};

export const NON_NUMERIC_ATTRIBUTES = [
  "access_token",
  "auto_update",
  "available_modes",
  "away_mode",
  "changed_by",
  "code_format",
  "color_modes",
  "current_activity",
  "device_class",
  "editable",
  "effect_list",
  "effect",
  "entity_picture",
  "event_type",
  "event_types",
  "fan_mode",
  "fan_modes",
  "fan_speed_list",
  "forecast",
  "friendly_name",
  "frontend_stream_type",
  "has_date",
  "has_time",
  "hs_color",
  "hvac_mode",
  "hvac_modes",
  "icon",
  "media_album_name",
  "media_artist",
  "media_content_type",
  "media_position_updated_at",
  "media_title",
  "next_dawn",
  "next_dusk",
  "next_midnight",
  "next_noon",
  "next_rising",
  "next_setting",
  "operation_list",
  "operation_mode",
  "options",
  "preset_mode",
  "preset_modes",
  "release_notes",
  "release_summary",
  "release_url",
  "restored",
  "rgb_color",
  "rgbw_color",
  "shuffle",
  "sound_mode_list",
  "sound_mode",
  "source_list",
  "source_type",
  "source",
  "state_class",
  "supported_features",
  "swing_mode",
  "swing_mode",
  "swing_modes",
  "title",
  "token",
  "unit_of_measurement",
  "xy_color",
];

export const MORE_INFO_MAIN_VIEW_EXTRA_ATTRIBUTE_FILTERS = {
  default: [],
  cover: ["current_position", "current_tilt_position"],
  input_boolean: [],
  light: [
    "brightness",
    "color_temp",
    "color_temp_kelvin",
    "white_value",
    "effect_list",
    "effect",
    "hs_color",
    "rgb_color",
    "rgbw_color",
    "rgbww_color",
    "xy_color",
    "min_mireds",
    "max_mireds",
    "min_color_temp_kelvin",
    "max_color_temp_kelvin",
    "entity_id",
    "supported_color_modes",
    "color_mode",
  ],
  lock: ["code_format"],
  person: ["id", "user_id", "editable", "device_trackers"],
  remote: ["activity_list", "current_activity"],
  siren: [],
  switch: [],
  timer: ["remaining", "restore"],
  vacuum: [
    "fan_speed",
    "fan_speed_list",
    "status",
    "battery_level",
    "battery_icon",
  ],
  valve: ["current_position", "current_tilt_position"],
} as const satisfies Record<string, readonly string[]>;

export const computeShownAttributes = (stateObj: HassEntity) => {
  const domain = computeStateDomain(stateObj);
  const filtersArray = STATE_ATTRIBUTES.concat(
    STATE_ATTRIBUTES_DOMAIN_CLASS[domain]?.[
      stateObj.attributes?.device_class
    ] || []
  );
  return Object.keys(stateObj.attributes).filter(
    (key) => filtersArray.indexOf(key) === -1
  );
};

export const computeMainViewShownAttributes = (
  stateObj: HassEntity,
  moreInfoType: string
) => {
  const mainViewExtraFilters =
    MORE_INFO_MAIN_VIEW_EXTRA_ATTRIBUTE_FILTERS[moreInfoType];

  if (!mainViewExtraFilters) {
    return [];
  }

  return computeShownAttributes(stateObj).filter(
    (attribute) => mainViewExtraFilters.indexOf(attribute) === -1
  );
};

export const computeAdditionalMoreInfoAttributes = (
  stateObj: HassEntity,
  moreInfoType: string
) => {
  const shownAttributes = computeShownAttributes(stateObj);
  const mainViewAttributes = new Set(
    computeMainViewShownAttributes(stateObj, moreInfoType)
  );

  return shownAttributes.filter(
    (attribute) => !mainViewAttributes.has(attribute)
  );
};
