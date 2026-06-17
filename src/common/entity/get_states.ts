import type { HassEntity } from "home-assistant-js-websocket";
import { UNAVAILABLE, UNKNOWN } from "../../data/entity/entity";
import type { HomeAssistant } from "../../types";
import { stringCompare } from "../string/compare";
import { computeDomain } from "./compute_domain";
import { computeStateDomain } from "./compute_state_domain";

export const FIXED_DOMAIN_STATES = {
  alarm_control_panel: [
    "armed_away",
    "armed_custom_bypass",
    "armed_home",
    "armed_night",
    "armed_vacation",
    "arming",
    "disarmed",
    "disarming",
    "pending",
    "triggered",
  ],
  alert: ["on", "off", "idle"],
  assist_satellite: ["idle", "listening", "responding", "processing"],
  automation: ["on", "off"],
  binary_sensor: ["on", "off"],
  button: [],
  calendar: ["on", "off"],
  camera: ["idle", "recording", "streaming"],
  cover: ["closed", "closing", "open", "opening"],
  device_tracker: ["home", "not_home"],
  fan: ["on", "off"],
  humidifier: ["on", "off"],
  infrared: [],
  input_boolean: ["on", "off"],
  input_button: [],
  lawn_mower: ["error", "paused", "mowing", "returning", "docked"],
  light: ["on", "off"],
  lock: [
    "jammed",
    "locked",
    "locking",
    "unlocked",
    "unlocking",
    "opening",
    "open",
  ],
  media_player: [
    "off",
    "on",
    "idle",
    "playing",
    "paused",
    "standby",
    "buffering",
  ],
  person: ["home", "not_home"],
  plant: ["ok", "problem"],
  radio_frequency: [],
  remote: ["on", "off"],
  scene: [],
  schedule: ["on", "off"],
  script: ["on", "off"],
  siren: ["on", "off"],
  sun: ["above_horizon", "below_horizon"],
  switch: ["on", "off"],
  timer: ["active", "idle", "paused"],
  update: ["on", "off"],
  vacuum: ["cleaning", "docked", "error", "idle", "paused", "returning"],
  valve: ["closed", "closing", "open", "opening"],
  weather: [
    "clear-night",
    "cloudy",
    "exceptional",
    "fog",
    "hail",
    "lightning-rainy",
    "lightning",
    "partlycloudy",
    "pouring",
    "rainy",
    "snowy-rainy",
    "snowy",
    "sunny",
    "windy-variant",
    "windy",
  ],
} as const;

const FIXED_DOMAIN_ATTRIBUTE_STATES = {
  alarm_control_panel: {
    code_format: ["number", "text"],
  },
  binary_sensor: {
    device_class: [
      "battery",
      "battery_charging",
      "co",
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
      "running",
      "safety",
      "smoke",
      "sound",
      "tamper",
      "update",
      "vibration",
      "window",
    ],
  },
  button: {
    device_class: ["restart", "update"],
  },
  camera: {
    frontend_stream_type: ["hls", "web_rtc"],
  },
  climate: {
    hvac_action: [
      "off",
      "idle",
      "preheating",
      "defrosting",
      "heating",
      "cooling",
      "drying",
      "fan",
    ],
  },
  cover: {
    device_class: [
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
  },
  device_tracker: {
    source_type: ["bluetooth", "bluetooth_le", "gps", "router"],
  },
  fan: {
    direction: ["forward", "reverse"],
  },
  humidifier: {
    device_class: ["humidifier", "dehumidifier"],
    action: ["off", "idle", "humidifying", "drying"],
  },
  media_player: {
    device_class: ["tv", "speaker", "receiver"],
    media_content_type: [
      "album",
      "app",
      "artist",
      "channel",
      "channels",
      "composer",
      "contributing_artist",
      "episode",
      "game",
      "genre",
      "image",
      "movie",
      "music",
      "playlist",
      "podcast",
      "season",
      "track",
      "tvshow",
      "url",
      "video",
    ],
    repeat: ["off", "one", "all"],
  },
  number: {
    device_class: ["temperature"],
  },
  sensor: {
    device_class: [
      "apparent_power",
      "aqi",
      "battery",
      "carbon_dioxide",
      "carbon_monoxide",
      "current",
      "date",
      "duration",
      "energy",
      "frequency",
      "gas",
      "humidity",
      "illuminance",
      "monetary",
      "nitrogen_dioxide",
      "nitrogen_monoxide",
      "nitrous_oxide",
      "ozone",
      "ph",
      "pm1",
      "pm10",
      "pm25",
      "pm4",
      "power_factor",
      "power",
      "pressure",
      "reactive_power",
      "signal_strength",
      "sulphur_dioxide",
      "temperature",
      "timestamp",
      "uptime",
      "volatile_organic_compounds",
      "volatile_organic_compounds_parts",
      "voltage",
      "volume_flow_rate",
    ],
    state_class: ["measurement", "total", "total_increasing"],
  },
  switch: {
    device_class: ["outlet", "switch"],
  },
  update: {
    device_class: ["firmware"],
  },
  water_heater: {
    away_mode: ["on", "off"],
  },
};

export const getStatesDomain = (
  hass: HomeAssistant,
  domain: string,
  attribute?: string | undefined
): string[] => {
  const result: string[] = [];

  if (!attribute) {
    // All entities can have unavailable states
    result.push(UNAVAILABLE, UNKNOWN);
  }

  if (!attribute && domain in FIXED_DOMAIN_STATES) {
    result.push(...FIXED_DOMAIN_STATES[domain]);
  } else if (
    attribute &&
    domain in FIXED_DOMAIN_ATTRIBUTE_STATES &&
    attribute in FIXED_DOMAIN_ATTRIBUTE_STATES[domain]
  ) {
    result.push(...FIXED_DOMAIN_ATTRIBUTE_STATES[domain][attribute]);
  }

  switch (domain) {
    case "device_tracker":
    case "person":
      if (!attribute) {
        result.push(
          ...Object.entries(hass.states)
            .filter(
              ([entityId, stateObj]) =>
                computeDomain(entityId) === "zone" &&
                entityId !== "zone.home" &&
                stateObj.attributes.friendly_name
            )
            .map(([_entityId, stateObj]) => stateObj.attributes.friendly_name!)
            .sort((zone1, zone2) =>
              stringCompare(zone1, zone2, hass.locale.language)
            )
        );
      }
      break;
  }

  return result;
};

// Maps a value attribute (or the main state, keyed `_`) to the attribute listing
// its options. Naming is irregular per domain, so it's mapped explicitly.
export const DOMAIN_OPTIONS_ATTRIBUTES: Record<
  string,
  Record<string, string>
> = {
  climate: {
    _: "hvac_modes",
    fan_mode: "fan_modes",
    preset_mode: "preset_modes",
    swing_mode: "swing_modes",
    swing_horizontal_mode: "swing_horizontal_modes",
  },
  event: {
    event_type: "event_types",
  },
  fan: {
    preset_mode: "preset_modes",
  },
  humidifier: {
    mode: "available_modes",
  },
  input_select: {
    _: "options",
  },
  select: {
    _: "options",
  },
  light: {
    effect: "effect_list",
    color_mode: "supported_color_modes",
  },
  media_player: {
    sound_mode: "sound_mode_list",
    source: "source_list",
  },
  remote: {
    current_activity: "activity_list",
  },
  sensor: {
    _: "options",
  },
  vacuum: {
    fan_speed: "fan_speed_list",
  },
  water_heater: {
    _: "operation_list",
    operation_mode: "operation_list",
  },
};

const DOMAIN_VALUE_ATTRIBUTES: Record<
  string,
  Record<string, string>
> = Object.fromEntries(
  Object.entries(DOMAIN_OPTIONS_ATTRIBUTES).map(([domain, mapping]) => [
    domain,
    Object.fromEntries(
      Object.entries(mapping).map(([value, list]) => [list, value])
    ),
  ])
);

// value attribute (or main state) → its options-list attribute
export const getOptionsAttribute = (
  domain: string,
  attribute?: string
): string | undefined => DOMAIN_OPTIONS_ATTRIBUTES[domain]?.[attribute ?? "_"];

// options-list attribute → its value attribute (`_` = main state)
export const getValueAttribute = (
  domain: string,
  optionsAttribute: string
): string | undefined => DOMAIN_VALUE_ATTRIBUTES[domain]?.[optionsAttribute];

export const getStates = (
  hass: HomeAssistant,
  state: HassEntity,
  attribute: string | undefined = undefined
): string[] => {
  const domain = computeStateDomain(state);
  const result: string[] = [];

  // Fixed values based on a domain
  result.push(...getStatesDomain(hass, domain, attribute));

  // Dynamic values based on the entities
  const optionsAttribute = getOptionsAttribute(domain, attribute);
  if (optionsAttribute) {
    const options = state.attributes[optionsAttribute];
    // Sensors only expose their options when their device class is `enum`.
    const enumSensor =
      domain !== "sensor" || state.attributes.device_class === "enum";
    if (enumSensor && Array.isArray(options)) {
      result.push(...options);
    }
  }

  return [...new Set(result)];
};
