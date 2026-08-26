/** Constants to be used in the frontend. */

// Constants should be alphabetically sorted by name.
// Arrays with values should be alphabetically sorted if order doesn't matter.
// Each constant should have a description what it is supposed to be used for.

/** Domains that have a state card. */
export const DOMAINS_WITH_CARD = [
  "alert",
  "button",
  "climate",
  "cover",
  "configurator",
  "event",
  "input_button",
  "input_select",
  "input_number",
  "input_text",
  "humidifier",
  "lawn_mower",
  "lock",
  "media_player",
  "number",
  "scene",
  "script",
  "select",
  "timer",
  "text",
  "update",
  "vacuum",
  "water_heater",
];

export const SENSOR_ENTITIES = [
  "sensor",
  "binary_sensor",
  "calendar",
  "camera",
  "device_tracker",
  "image",
  "weather",
];

export const ASSIST_ENTITIES = [
  "assist_satellite",
  "conversation",
  "stt",
  "tts",
];

/** Domains that render an input element instead of a text value when displayed in a row.
 *  Those rows should then not show a cursor pointer when hovered (which would normally
 *  be the default) unless the element itself enforces it (e.g. a button). Also those elements
 *  should not act as a click target to open the more info dialog (the row name and state icon
 *  still do of course) as the click should instead e.g. activate the input field  or toggle
 *  the button that this row shows.
 */
export const DOMAINS_INPUT_ROW = [
  "automation",
  "button",
  "cover",
  "date",
  "datetime",
  "fan",
  "group",
  "humidifier",
  "input_boolean",
  "input_button",
  "input_datetime",
  "input_number",
  "input_select",
  "input_text",
  "light",
  "lock",
  "media_player",
  "number",
  "scene",
  "script",
  "select",
  "switch",
  "text",
  "time",
  "vacuum",
  "valve",
];

/** States that we consider "off". */
export const STATES_OFF = ["closed", "locked", "off"];

/** Binary States */
export const BINARY_STATE_ON = "on";
export const BINARY_STATE_OFF = "off";

/** Domains where we allow toggle in Lovelace.
 *  This is not strictly a list of what is possible to toggle, but the list of
 *  domains where toggle is considered the primary default behavior.
 *  Entities card uses this to determine which entities are controlled by the
 *  header toggle.
 *  Some cards use this to decide the default tap action.
 *  Use canToggleDomain/canToggleState for determining if toggling is possible.
 */
export const DOMAINS_TOGGLE = new Set([
  "fan",
  "input_boolean",
  "light",
  "switch",
  "group",
  "automation",
  "humidifier",
  "valve",
]);

/** Domains that have a dynamic entity image / picture. */
export const DOMAINS_WITH_DYNAMIC_PICTURE = new Set([
  "camera",
  "image",
  "media_player",
]);

/** Domains that use a timestamp for state. */
const TIMESTAMP_STATE_DOMAINS_LIST = [
  "ai_task",
  "button",
  "conversation",
  "event",
  "image",
  "infrared",
  "input_button",
  "notify",
  "radio_frequency",
  "scene",
  "stt",
  "tag",
  "tts",
  "wake_word",
  "datetime",
] as const;

export type TimestampStateDomain =
  (typeof TIMESTAMP_STATE_DOMAINS_LIST)[number];

export const TIMESTAMP_STATE_DOMAINS = new Set<string>(
  TIMESTAMP_STATE_DOMAINS_LIST
);

/** Temperature units. */
export const UNIT_C = "°C";
export const UNIT_F = "°F";

/** Length units. */
export const UNIT_IN = "in";
export const UNIT_KM = "km";
export const UNIT_MM = "mm";

/** Pressure units. */
export const UNIT_HPA = "hPa";
export const UNIT_INHG = "inHg";

/** Entity ID of the default view. */
export const DEFAULT_VIEW_ENTITY_ID = "group.default_view";

/** String to visually separate labels on UI */
export const STRINGS_SEPARATOR_DOT = " · ";
