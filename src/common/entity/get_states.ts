import { HassEntity } from "home-assistant-js-websocket";
import { computeStateDomain } from "./compute_state_domain";
import { UNAVAILABLE_STATES } from "../../data/entity";

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
  automation: ["on", "off"],
  binary_sensor: ["on", "off"],
  button: [],
  calendar: ["on", "off"],
  camera: ["idle", "recording", "streaming"],
  cover: ["closed", "closing", "open", "opening"],
  device_tracker: ["home", "not_home"],
  fan: ["on", "off"],
  humidifier: ["on", "off"],
  input_boolean: ["on", "off"],
  input_button: [],
  lawn_mower: ["error", "paused", "mowing", "docked"],
  light: ["on", "off"],
  lock: ["jammed", "locked", "locking", "unlocked", "unlocking"],
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
      "contibuting_artist",
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
      "power_factor",
      "power",
      "pressure",
      "reactive_power",
      "signal_strength",
      "sulphur_dioxide",
      "temperature",
      "timestamp",
      "volatile_organic_compounds",
      "volatile_organic_compounds_parts",
      "voltage",
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

export const getStates = (
  state: HassEntity,
  attribute: string | undefined = undefined
): string[] => {
  const domain = computeStateDomain(state);
  const result: string[] = [];

  if (!attribute && domain in FIXED_DOMAIN_STATES) {
    result.push(...FIXED_DOMAIN_STATES[domain]);
  } else if (
    attribute &&
    domain in FIXED_DOMAIN_ATTRIBUTE_STATES &&
    attribute in FIXED_DOMAIN_ATTRIBUTE_STATES[domain]
  ) {
    result.push(...FIXED_DOMAIN_ATTRIBUTE_STATES[domain][attribute]);
  }

  // Dynamic values based on the entities
  switch (domain) {
    case "climate":
      if (!attribute) {
        result.push(...state.attributes.hvac_modes);
      } else if (attribute === "fan_mode") {
        result.push(...state.attributes.fan_modes);
      } else if (attribute === "preset_mode") {
        result.push(...state.attributes.preset_modes);
      } else if (attribute === "swing_mode") {
        result.push(...state.attributes.swing_modes);
      }
      break;
    case "device_tracker":
    case "person":
      if (!attribute) {
        result.push("home", "not_home");
      }
      break;
    case "event":
      if (attribute === "event_type") {
        result.push(...state.attributes.event_types);
      }
      break;
    case "fan":
      if (attribute === "preset_mode") {
        result.push(...state.attributes.preset_modes);
      }
      break;
    case "humidifier":
      if (attribute === "mode") {
        result.push(...state.attributes.available_modes);
      }
      break;
    case "input_select":
    case "select":
      if (!attribute) {
        result.push(...state.attributes.options);
      }
      break;
    case "light":
      if (attribute === "effect" && state.attributes.effect_list) {
        result.push(...state.attributes.effect_list);
      } else if (
        attribute === "color_mode" &&
        state.attributes.supported_color_modes
      ) {
        result.push(...state.attributes.supported_color_modes);
      }
      break;
    case "media_player":
      if (attribute === "sound_mode") {
        result.push(...state.attributes.sound_mode_list);
      } else if (attribute === "source") {
        result.push(...state.attributes.source_list);
      }
      break;
    case "remote":
      if (attribute === "current_activity") {
        result.push(...state.attributes.activity_list);
      }
      break;
    case "sensor":
      if (!attribute && state.attributes.device_class === "enum") {
        result.push(...state.attributes.options);
      }
      break;
    case "vacuum":
      if (attribute === "fan_speed") {
        result.push(...state.attributes.fan_speed_list);
      }
      break;
    case "water_heater":
      if (!attribute || attribute === "operation_mode") {
        result.push(...state.attributes.operation_list);
      }
      break;
  }

  if (!attribute) {
    // All entities can have unavailable states
    result.push(...UNAVAILABLE_STATES);
  }
  return [...new Set(result)];
};
