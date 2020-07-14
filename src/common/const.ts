/** Constants to be used in the frontend. */

// Constants should be alphabetically sorted by name.
// Arrays with values should be alphabetically sorted if order doesn't matter.
// Each constant should have a description what it is supposed to be used for.

/** Icon to use when no icon specified for domain. */
export const DEFAULT_DOMAIN_ICON = "hass:bookmark";

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
  "updater",
  "vacuum",
  "water_heater",
  "weather",
];

/** Domains that show no more info dialog. */
export const DOMAINS_HIDE_MORE_INFO = [
  "input_number",
  "input_select",
  "input_text",
  "scene",
];

/** Domains that should have the history hidden in the more info dialog. */
export const DOMAINS_MORE_INFO_NO_HISTORY = ["camera", "configurator", "scene"];

/** States that we consider "off". */
export const STATES_OFF = ["closed", "locked", "off"];

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
