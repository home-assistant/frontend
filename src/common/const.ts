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
  "weblink",
];

/** Domains with separate more info dialog. */
export const DOMAINS_WITH_MORE_INFO = [
  "alarm_control_panel",
  "automation",
  "camera",
  "climate",
  "configurator",
  "cover",
  "fan",
  "group",
  "history_graph",
  "input_datetime",
  "light",
  "lock",
  "media_player",
  "script",
  "sun",
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
  "weblink",
];

/** Domains that should have the history hidden in the more info dialog. */
export const DOMAINS_MORE_INFO_NO_HISTORY = [
  "camera",
  "configurator",
  "history_graph",
  "scene",
];

/** States that we consider "off". */
export const STATES_OFF = ["closed", "locked", "off"];

/** Domains where we allow toggle in Lovelace. */
export const DOMAINS_TOGGLE = new Set([
  "fan",
  "input_boolean",
  "light",
  "switch",
]);

/** Temperature units. */
export const UNIT_C = "°C";
export const UNIT_F = "°F";

/** Entity ID of the default view. */
export const DEFAULT_VIEW_ENTITY_ID = "group.default_view";
