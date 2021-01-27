/** Constants to be used in the frontend. */

// Constants should be alphabetically sorted by name.
// Arrays with values should be alphabetically sorted if order doesn't matter.
// Each constant should have a description what it is supposed to be used for.

/** Icon to use when no icon specified for domain. */
export const DEFAULT_DOMAIN_ICON = "hass:bookmark";

/** Icons for each domain */
export const FIXED_DOMAIN_ICONS = {
  alert: "hass:alert",
  alexa: "hass:amazon-alexa",
  air_quality: "hass:air-filter",
  automation: "hass:robot",
  calendar: "hass:calendar",
  camera: "hass:video",
  climate: "hass:thermostat",
  configurator: "hass:cog",
  conversation: "hass:text-to-speech",
  counter: "hass:counter",
  device_tracker: "hass:account",
  fan: "hass:fan",
  google_assistant: "hass:google-assistant",
  group: "hass:google-circles-communities",
  homeassistant: "hass:home-assistant",
  homekit: "hass:home-automation",
  image_processing: "hass:image-filter-frames",
  input_boolean: "hass:toggle-switch-outline",
  input_datetime: "hass:calendar-clock",
  input_number: "hass:ray-vertex",
  input_select: "hass:format-list-bulleted",
  input_text: "hass:form-textbox",
  light: "hass:lightbulb",
  mailbox: "hass:mailbox",
  notify: "hass:comment-alert",
  number: "hass:ray-vertex",
  persistent_notification: "hass:bell",
  person: "hass:account",
  plant: "hass:flower",
  proximity: "hass:apple-safari",
  remote: "hass:remote",
  scene: "hass:palette",
  script: "hass:script-text",
  sensor: "hass:eye",
  simple_alarm: "hass:bell",
  sun: "hass:white-balance-sunny",
  switch: "hass:flash",
  timer: "hass:timer-outline",
  updater: "hass:cloud-upload",
  vacuum: "hass:robot-vacuum",
  water_heater: "hass:thermometer",
  weather: "hass:weather-cloudy",
  zone: "hass:map-marker-radius",
};

export const FIXED_DEVICE_CLASS_ICONS = {
  current: "hass:current-ac",
  energy: "hass:flash",
  humidity: "hass:water-percent",
  illuminance: "hass:brightness-5",
  temperature: "hass:thermometer",
  pressure: "hass:gauge",
  power: "hass:flash",
  power_factor: "hass:angle-acute",
  signal_strength: "hass:wifi",
  timestamp: "hass:clock",
  voltage: "hass:sine-wave",
};

/** Domains that have a state card. */
export const DOMAINS_WITH_CARD = [
  "climate",
  "cover",
  "configurator",
  "input_select",
  "input_number",
  "input_text",
  "lock",
  "media_player",
  "number",
  "scene",
  "script",
  "timer",
  "vacuum",
  "water_heater",
];

/** Domains with separate more info dialog. */
export const DOMAINS_WITH_MORE_INFO = [
  "alarm_control_panel",
  "automation",
  "camera",
  "climate",
  "configurator",
  "counter",
  "cover",
  "fan",
  "group",
  "humidifier",
  "input_datetime",
  "light",
  "lock",
  "media_player",
  "person",
  "script",
  "sun",
  "timer",
  "vacuum",
  "water_heater",
  "weather",
];

/** Domains that show no more info dialog. */
export const DOMAINS_HIDE_MORE_INFO = [
  "input_number",
  "input_select",
  "input_text",
  "number",
  "scene",
];

/** Domains that should have the history hidden in the more info dialog. */
export const DOMAINS_MORE_INFO_NO_HISTORY = ["camera", "configurator", "scene"];

/** States that we consider "off". */
export const STATES_OFF = ["closed", "locked", "off"];

/** Binary States */
export const BINARY_STATE_ON = "on";
export const BINARY_STATE_OFF = "off";

/** Domains where we allow toggle in Lovelace. */
export const DOMAINS_TOGGLE = new Set([
  "fan",
  "input_boolean",
  "light",
  "switch",
  "group",
  "automation",
  "humidifier",
]);

/** Domains that have a dynamic entity image / picture. */
export const DOMAINS_WITH_DYNAMIC_PICTURE = new Set(["camera", "media_player"]);

/** Temperature units. */
export const UNIT_C = "°C";
export const UNIT_F = "°F";

/** Entity ID of the default view. */
export const DEFAULT_VIEW_ENTITY_ID = "group.default_view";

/** HA Color Pallete. */
export const HA_COLOR_PALETTE = [
  "ff0029",
  "66a61e",
  "377eb8",
  "984ea3",
  "00d2d5",
  "ff7f00",
  "af8d00",
  "7f80cd",
  "b3e900",
  "c42e60",
  "a65628",
  "f781bf",
  "8dd3c7",
  "bebada",
  "fb8072",
  "80b1d3",
  "fdb462",
  "fccde5",
  "bc80bd",
  "ffed6f",
  "c4eaff",
  "cf8c00",
  "1b9e77",
  "d95f02",
  "e7298a",
  "e6ab02",
  "a6761d",
  "0097ff",
  "00d067",
  "f43600",
  "4ba93b",
  "5779bb",
  "927acc",
  "97ee3f",
  "bf3947",
  "9f5b00",
  "f48758",
  "8caed6",
  "f2b94f",
  "eff26e",
  "e43872",
  "d9b100",
  "9d7a00",
  "698cff",
  "d9d9d9",
  "00d27e",
  "d06800",
  "009f82",
  "c49200",
  "cbe8ff",
  "fecddf",
  "c27eb6",
  "8cd2ce",
  "c4b8d9",
  "f883b0",
  "a49100",
  "f48800",
  "27d0df",
  "a04a9b",
];
