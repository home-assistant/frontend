/** Constants to be used in the frontend. */

import {
  mdiAirFilter,
  mdiAlert,
  mdiAngleAcute,
  mdiAppleSafari,
  mdiArrowLeftRight,
  mdiBell,
  mdiBookmark,
  mdiBrightness5,
  mdiBullhorn,
  mdiButtonPointer,
  mdiCalendar,
  mdiCalendarClock,
  mdiCarCoolantLevel,
  mdiCash,
  mdiChatSleep,
  mdiClipboardList,
  mdiClock,
  mdiCloudUpload,
  mdiCog,
  mdiCommentAlert,
  mdiCounter,
  mdiCurrentAc,
  mdiDatabase,
  mdiEarHearing,
  mdiEye,
  mdiFlash,
  mdiFlower,
  mdiFormatListBulleted,
  mdiFormTextbox,
  mdiGauge,
  mdiGoogleAssistant,
  mdiGoogleCirclesCommunities,
  mdiHomeAutomation,
  mdiImage,
  mdiImageFilterFrames,
  mdiLightbulb,
  mdiLightningBolt,
  mdiMailbox,
  mdiMapMarkerRadius,
  mdiMeterGas,
  mdiMicrophoneMessage,
  mdiMolecule,
  mdiMoleculeCo,
  mdiMoleculeCo2,
  mdiPalette,
  mdiPh,
  mdiProgressClock,
  mdiRayVertex,
  mdiRemote,
  mdiRobotMower,
  mdiRobotVacuum,
  mdiScriptText,
  mdiSineWave,
  mdiSpeakerMessage,
  mdiSpeedometer,
  mdiSunWireless,
  mdiThermometer,
  mdiThermometerLines,
  mdiThermostat,
  mdiTimerOutline,
  mdiTransmissionTower,
  mdiWater,
  mdiWaterPercent,
  mdiWeatherPouring,
  mdiWeatherRainy,
  mdiWeatherWindy,
  mdiWeight,
  mdiWifi,
} from "@mdi/js";

import { mdiHomeAssistant } from "../resources/home-assistant-logo-svg";

// Constants should be alphabetically sorted by name.
// Arrays with values should be alphabetically sorted if order doesn't matter.
// Each constant should have a description what it is supposed to be used for.

/** Icon to use when no icon specified for domain. */
export const DEFAULT_DOMAIN_ICON = mdiBookmark;

/** Icons for each domain */
export const FIXED_DOMAIN_ICONS = {
  air_quality: mdiAirFilter,
  alert: mdiAlert,
  calendar: mdiCalendar,
  climate: mdiThermostat,
  configurator: mdiCog,
  conversation: mdiMicrophoneMessage,
  counter: mdiCounter,
  datetime: mdiCalendarClock,
  date: mdiCalendar,
  demo: mdiHomeAssistant,
  google_assistant: mdiGoogleAssistant,
  group: mdiGoogleCirclesCommunities,
  homeassistant: mdiHomeAssistant,
  homekit: mdiHomeAutomation,
  image: mdiImage,
  image_processing: mdiImageFilterFrames,
  input_button: mdiButtonPointer,
  input_datetime: mdiCalendarClock,
  input_number: mdiRayVertex,
  input_select: mdiFormatListBulleted,
  input_text: mdiFormTextbox,
  lawn_mower: mdiRobotMower,
  light: mdiLightbulb,
  mailbox: mdiMailbox,
  notify: mdiCommentAlert,
  number: mdiRayVertex,
  persistent_notification: mdiBell,
  plant: mdiFlower,
  proximity: mdiAppleSafari,
  remote: mdiRemote,
  scene: mdiPalette,
  schedule: mdiCalendarClock,
  script: mdiScriptText,
  select: mdiFormatListBulleted,
  sensor: mdiEye,
  simple_alarm: mdiBell,
  siren: mdiBullhorn,
  stt: mdiMicrophoneMessage,
  text: mdiFormTextbox,
  todo: mdiClipboardList,
  time: mdiClock,
  timer: mdiTimerOutline,
  tts: mdiSpeakerMessage,
  updater: mdiCloudUpload,
  vacuum: mdiRobotVacuum,
  wake_word: mdiChatSleep,
  zone: mdiMapMarkerRadius,
};

export const FIXED_DEVICE_CLASS_ICONS = {
  apparent_power: mdiFlash,
  aqi: mdiAirFilter,
  atmospheric_pressure: mdiThermometerLines,
  // battery: mdiBattery, => not included by design since `sensorIcon()` will dynamically determine the icon
  carbon_dioxide: mdiMoleculeCo2,
  carbon_monoxide: mdiMoleculeCo,
  current: mdiCurrentAc,
  data_rate: mdiTransmissionTower,
  data_size: mdiDatabase,
  date: mdiCalendar,
  distance: mdiArrowLeftRight,
  duration: mdiProgressClock,
  energy: mdiLightningBolt,
  frequency: mdiSineWave,
  gas: mdiMeterGas,
  humidity: mdiWaterPercent,
  illuminance: mdiBrightness5,
  irradiance: mdiSunWireless,
  moisture: mdiWaterPercent,
  monetary: mdiCash,
  nitrogen_dioxide: mdiMolecule,
  nitrogen_monoxide: mdiMolecule,
  nitrous_oxide: mdiMolecule,
  ozone: mdiMolecule,
  ph: mdiPh,
  pm1: mdiMolecule,
  pm10: mdiMolecule,
  pm25: mdiMolecule,
  power: mdiFlash,
  power_factor: mdiAngleAcute,
  precipitation: mdiWeatherRainy,
  precipitation_intensity: mdiWeatherPouring,
  pressure: mdiGauge,
  reactive_power: mdiFlash,
  signal_strength: mdiWifi,
  sound_pressure: mdiEarHearing,
  speed: mdiSpeedometer,
  sulphur_dioxide: mdiMolecule,
  temperature: mdiThermometer,
  timestamp: mdiClock,
  volatile_organic_compounds: mdiMolecule,
  volatile_organic_compounds_parts: mdiMolecule,
  voltage: mdiSineWave,
  volume: mdiCarCoolantLevel,
  water: mdiWater,
  weight: mdiWeight,
  wind_speed: mdiWeatherWindy,
};

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
  "vacuum",
  "water_heater",
];

export const SENSOR_ENTITIES = [
  "sensor",
  "binary_sensor",
  "calendar",
  "camera",
  "device_tracker",
  "weather",
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
export const DOMAINS_WITH_DYNAMIC_PICTURE = new Set([
  "camera",
  "image",
  "media_player",
]);

/** Temperature units. */
export const UNIT_C = "°C";
export const UNIT_F = "°F";

/** Entity ID of the default view. */
export const DEFAULT_VIEW_ENTITY_ID = "group.default_view";
