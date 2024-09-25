/** Constants to be used in the frontend. */

import {
  mdiAccount,
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
  mdiFormatListCheckbox,
  mdiFormTextbox,
  mdiForumOutline,
  mdiGauge,
  mdiGoogleAssistant,
  mdiGoogleCirclesCommunities,
  mdiHomeAutomation,
  mdiImage,
  mdiImageFilterFrames,
  mdiLightbulb,
  mdiLightningBolt,
  mdiMapMarkerRadius,
  mdiMeterGas,
  mdiMicrophoneMessage,
  mdiMolecule,
  mdiMoleculeCo,
  mdiMoleculeCo2,
  mdiPalette,
  mdiPh,
  mdiPipe,
  mdiProgressClock,
  mdiRayVertex,
  mdiRemote,
  mdiRobot,
  mdiRobotMower,
  mdiRobotVacuum,
  mdiRoomService,
  mdiScriptText,
  mdiSineWave,
  mdiSpeakerMessage,
  mdiSpeedometer,
  mdiSunWireless,
  mdiThermometer,
  mdiThermometerLines,
  mdiThermostat,
  mdiTimerOutline,
  mdiToggleSwitch,
  mdiTransmissionTower,
  mdiWater,
  mdiWaterPercent,
  mdiWeatherPartlyCloudy,
  mdiWeatherPouring,
  mdiWeatherRainy,
  mdiWeatherWindy,
  mdiWeight,
  mdiWhiteBalanceSunny,
  mdiWifi,
} from "@mdi/js";

import { mdiHomeAssistant } from "../resources/home-assistant-logo-svg";

// Constants should be alphabetically sorted by name.
// Arrays with values should be alphabetically sorted if order doesn't matter.
// Each constant should have a description what it is supposed to be used for.

/** Icon to use when no icon specified for service. */
export const DEFAULT_SERVICE_ICON = mdiRoomService;

/** Icon to use when no icon specified for domain. */
export const DEFAULT_DOMAIN_ICON = mdiBookmark;

/** Icons for each domain */
export const FIXED_DOMAIN_ICONS = {
  air_quality: mdiAirFilter,
  alert: mdiAlert,
  automation: mdiRobot,
  calendar: mdiCalendar,
  climate: mdiThermostat,
  configurator: mdiCog,
  conversation: mdiForumOutline,
  counter: mdiCounter,
  date: mdiCalendar,
  datetime: mdiCalendarClock,
  demo: mdiHomeAssistant,
  device_tracker: mdiAccount,
  google_assistant: mdiGoogleAssistant,
  group: mdiGoogleCirclesCommunities,
  homeassistant: mdiHomeAssistant,
  homekit: mdiHomeAutomation,
  image_processing: mdiImageFilterFrames,
  image: mdiImage,
  input_boolean: mdiToggleSwitch,
  input_button: mdiButtonPointer,
  input_datetime: mdiCalendarClock,
  input_number: mdiRayVertex,
  input_select: mdiFormatListBulleted,
  input_text: mdiFormTextbox,
  lawn_mower: mdiRobotMower,
  light: mdiLightbulb,
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
  simple_alarm: mdiBell,
  siren: mdiBullhorn,
  stt: mdiMicrophoneMessage,
  sun: mdiWhiteBalanceSunny,
  text: mdiFormTextbox,
  time: mdiClock,
  timer: mdiTimerOutline,
  todo: mdiClipboardList,
  tts: mdiSpeakerMessage,
  vacuum: mdiRobotVacuum,
  wake_word: mdiChatSleep,
  weather: mdiWeatherPartlyCloudy,
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
  shopping_List: mdiFormatListCheckbox,
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
  volume_flow_rate: mdiPipe,
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

/** Domains where we allow toggle in Lovelace. */
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

/** Temperature units. */
export const UNIT_C = "°C";
export const UNIT_F = "°F";

/** Entity ID of the default view. */
export const DEFAULT_VIEW_ENTITY_ID = "group.default_view";
