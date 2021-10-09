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
  mdiTextToSpeech,
  mdiThermometer,
  mdiThermostat,
  mdiTimerOutline,
  mdiToggleSwitchOutline,
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
  conversation: mdiTextToSpeech,
  counter: mdiCounter,
  device_tracker: mdiAccount,
  fan: mdiFan,
  google_assistant: mdiGoogleAssistant,
  group: mdiGoogleCirclesCommunities,
  homeassistant: mdiHomeAssistant,
  homekit: mdiHomeAutomation,
  image_processing: mdiImageFilterFrames,
  input_boolean: mdiToggleSwitchOutline,
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
  script: mdiScriptText,
  select: mdiFormatListBulleted,
  sensor: mdiEye,
  simple_alarm: mdiBell,
  sun: mdiWhiteBalanceSunny,
  switch: mdiFlash,
  timer: mdiTimerOutline,
  updater: mdiCloudUpload,
  vacuum: mdiRobotVacuum,
  water_heater: mdiThermometer,
  weather: mdiWeatherCloudy,
  zone: mdiMapMarkerRadius,
};

export const FIXED_DEVICE_CLASS_ICONS = {
  aqi: mdiAirFilter,
  // battery: mdiBattery, => not included by design since `sensorIcon()` will dynamically determine the icon
  carbon_dioxide: mdiMoleculeCo2,
  carbon_monoxide: mdiMoleculeCo,
  current: mdiCurrentAc,
  date: mdiCalendar,
  energy: mdiLightningBolt,
  gas: mdiGasCylinder,
  humidity: mdiWaterPercent,
  illuminance: mdiBrightness5,
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
  signal_strength: mdiWifi,
  sulphur_dioxide: mdiMolecule,
  temperature: mdiThermometer,
  timestamp: mdiClock,
  volatile_organic_compounds: mdiMolecule,
  voltage: mdiSineWave,
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
  "select",
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
  "remote",
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
  "select",
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
