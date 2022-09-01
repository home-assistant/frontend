/** Constants to be used in the frontend. */

import {
  mdiAccount,
  mdiAirFilter,
  mdiAlert,
  mdiAngleAcute,
  mdiAppleSafari,
  mdiBell,
  mdiBookmark,
  mdiBrightness5,
  mdiBullhorn,
  mdiCalendar,
  mdiCalendarClock,
  mdiCash,
  mdiClock,
  mdiCloudUpload,
  mdiCog,
  mdiCommentAlert,
  mdiCounter,
  mdiCurrentAc,
  mdiEye,
  mdiFan,
  mdiFlash,
  mdiFlower,
  mdiFormatListBulleted,
  mdiFormTextbox,
  mdiGasCylinder,
  mdiGauge,
  mdiGestureTapButton,
  mdiGoogleAssistant,
  mdiGoogleCirclesCommunities,
  mdiHomeAssistant,
  mdiHomeAutomation,
  mdiImageFilterFrames,
  mdiLightbulb,
  mdiLightningBolt,
  mdiMailbox,
  mdiMapMarkerRadius,
  mdiMolecule,
  mdiMoleculeCo,
  mdiMoleculeCo2,
  mdiPalette,
  mdiRayVertex,
  mdiRemote,
  mdiRobot,
  mdiRobotVacuum,
  mdiScriptText,
  mdiSineWave,
  mdiMicrophoneMessage,
  mdiThermometer,
  mdiThermostat,
  mdiTimerOutline,
  mdiVideo,
  mdiWaterPercent,
  mdiWeatherCloudy,
  mdiWhiteBalanceSunny,
  mdiWifi,
} from "@mdi/js";

// Constants should be alphabetically sorted by name.
// Arrays with values should be alphabetically sorted if order doesn't matter.
// Each constant should have a description what it is supposed to be used for.

/** Icon to use when no icon specified for domain. */
export const DEFAULT_DOMAIN_ICON = mdiBookmark;

/** Icons for each domain */
export const FIXED_DOMAIN_ICONS = {
  alert: mdiAlert,
  air_quality: mdiAirFilter,
  automation: mdiRobot,
  calendar: mdiCalendar,
  camera: mdiVideo,
  climate: mdiThermostat,
  configurator: mdiCog,
  conversation: mdiMicrophoneMessage,
  counter: mdiCounter,
  demo: mdiHomeAssistant,
  fan: mdiFan,
  google_assistant: mdiGoogleAssistant,
  group: mdiGoogleCirclesCommunities,
  homeassistant: mdiHomeAssistant,
  homekit: mdiHomeAutomation,
  image_processing: mdiImageFilterFrames,
  input_button: mdiGestureTapButton,
  input_datetime: mdiCalendarClock,
  input_number: mdiRayVertex,
  input_select: mdiFormatListBulleted,
  input_text: mdiFormTextbox,
  light: mdiLightbulb,
  mailbox: mdiMailbox,
  notify: mdiCommentAlert,
  number: mdiRayVertex,
  persistent_notification: mdiBell,
  person: mdiAccount,
  plant: mdiFlower,
  proximity: mdiAppleSafari,
  remote: mdiRemote,
  scene: mdiPalette,
  schedule: mdiCalendarClock,
  script: mdiScriptText,
  select: mdiFormatListBulleted,
  sensor: mdiEye,
  siren: mdiBullhorn,
  simple_alarm: mdiBell,
  sun: mdiWhiteBalanceSunny,
  timer: mdiTimerOutline,
  updater: mdiCloudUpload,
  vacuum: mdiRobotVacuum,
  water_heater: mdiThermometer,
  weather: mdiWeatherCloudy,
  zone: mdiMapMarkerRadius,
};

export const FIXED_DEVICE_CLASS_ICONS = {
  apparent_power: mdiFlash,
  aqi: mdiAirFilter,
  // battery: mdiBattery, => not included by design since `sensorIcon()` will dynamically determine the icon
  carbon_dioxide: mdiMoleculeCo2,
  carbon_monoxide: mdiMoleculeCo,
  current: mdiCurrentAc,
  date: mdiCalendar,
  energy: mdiLightningBolt,
  frequency: mdiSineWave,
  gas: mdiGasCylinder,
  humidity: mdiWaterPercent,
  illuminance: mdiBrightness5,
  moisture: mdiWaterPercent,
  monetary: mdiCash,
  nitrogen_dioxide: mdiMolecule,
  nitrogen_monoxide: mdiMolecule,
  nitrous_oxide: mdiMolecule,
  ozone: mdiMolecule,
  pm1: mdiMolecule,
  pm10: mdiMolecule,
  pm25: mdiMolecule,
  power: mdiFlash,
  power_factor: mdiAngleAcute,
  pressure: mdiGauge,
  reactive_power: mdiFlash,
  signal_strength: mdiWifi,
  sulphur_dioxide: mdiMolecule,
  temperature: mdiThermometer,
  timestamp: mdiClock,
  volatile_organic_compounds: mdiMolecule,
  voltage: mdiSineWave,
};

/** Domains that have a state card. */
export const DOMAINS_WITH_CARD = [
  "button",
  "climate",
  "cover",
  "configurator",
  "input_button",
  "input_select",
  "input_number",
  "input_text",
  "lock",
  "media_player",
  "number",
  "scene",
  "script",
  "select",
  "timer",
  "vacuum",
  "water_heater",
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
  "vacuum",
];

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
