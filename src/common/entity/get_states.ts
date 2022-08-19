import { HassEntity } from "home-assistant-js-websocket";
import { computeStateDomain } from "./compute_state_domain";
import { UNAVAILABLE_STATES } from "../../data/entity";

const FIXED_DOMAIN_STATES = {
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
  light: ["on", "off"],
  lock: ["jammed", "locked", "locking", "unlocked", "unlocking"],
  media_player: ["idle", "off", "paused", "playing", "standby"],
  person: ["home", "not_home"],
  remote: ["on", "off"],
  scene: [],
  schedule: ["on", "off"],
  script: ["on", "off"],
  siren: ["on", "off"],
  sun: ["above_horizon", "below_horizon"],
  switch: ["on", "off"],
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
};

export const getStates = (state: HassEntity): string[] => {
  const domain = computeStateDomain(state);
  const result: string[] = [];

  if (domain in FIXED_DOMAIN_STATES) {
    result.push(...FIXED_DOMAIN_STATES[domain]);
  } else {
    // If not fixed, we at least know the current state
    result.push(state.state);
  }

  // Dynamic values based on the entities
  switch (domain) {
    case "climate":
      result.push(...state.attributes.hvac_modes);
      break;
    case "input_select":
    case "select":
      result.push(...state.attributes.options);
      break;
    case "water_heater":
      result.push(...state.attributes.operation_list);
      break;
  }

  // All entities can have unavailable states
  result.push(...UNAVAILABLE_STATES);
  return [...new Set(result)];
};
