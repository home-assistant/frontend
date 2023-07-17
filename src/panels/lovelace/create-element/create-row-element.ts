import "../entity-rows/hui-event-entity-row";
import "../entity-rows/hui-media-player-entity-row";
import "../entity-rows/hui-scene-entity-row";
import "../entity-rows/hui-script-entity-row";
import "../entity-rows/hui-sensor-entity-row";
import "../entity-rows/hui-simple-entity-row";
import "../entity-rows/hui-toggle-entity-row";
import { LovelaceRowConfig } from "../entity-rows/types";
import "../special-rows/hui-attribute-row";
import "../special-rows/hui-button-row";
import "../special-rows/hui-call-service-row";
import {
  createLovelaceElement,
  getLovelaceElementClass,
} from "./create-element-base";

const ALWAYS_LOADED_TYPES = new Set([
  "media-player-entity",
  "scene-entity",
  "script-entity",
  "sensor-entity",
  "simple-entity",
  "toggle-entity",
  "button",
  "call-service",
]);
const LAZY_LOAD_TYPES = {
  "button-entity": () => import("../entity-rows/hui-button-entity-row"),
  "climate-entity": () => import("../entity-rows/hui-climate-entity-row"),
  "cover-entity": () => import("../entity-rows/hui-cover-entity-row"),
  "date-entity": () => import("../entity-rows/hui-date-entity-row"),
  "datetime-entity": () => import("../entity-rows/hui-datetime-entity-row"),
  "event-entity": () => import("../entity-rows/hui-event-entity-row"),
  "group-entity": () => import("../entity-rows/hui-group-entity-row"),
  "input-button-entity": () =>
    import("../entity-rows/hui-input-button-entity-row"),
  "humidifier-entity": () => import("../entity-rows/hui-humidifier-entity-row"),
  "input-datetime-entity": () =>
    import("../entity-rows/hui-input-datetime-entity-row"),
  "input-number-entity": () =>
    import("../entity-rows/hui-input-number-entity-row"),
  "input-select-entity": () =>
    import("../entity-rows/hui-input-select-entity-row"),
  "input-text-entity": () => import("../entity-rows/hui-input-text-entity-row"),
  "lock-entity": () => import("../entity-rows/hui-lock-entity-row"),
  "number-entity": () => import("../entity-rows/hui-number-entity-row"),
  "select-entity": () => import("../entity-rows/hui-select-entity-row"),
  "text-entity": () => import("../entity-rows/hui-text-entity-row"),
  "time-entity": () => import("../entity-rows/hui-time-entity-row"),
  "timer-entity": () => import("../entity-rows/hui-timer-entity-row"),
  conditional: () => import("../special-rows/hui-conditional-row"),
  "weather-entity": () => import("../entity-rows/hui-weather-entity-row"),
  divider: () => import("../special-rows/hui-divider-row"),
  section: () => import("../special-rows/hui-section-row"),
  weblink: () => import("../special-rows/hui-weblink-row"),
  cast: () => import("../special-rows/hui-cast-row"),
  buttons: () => import("../special-rows/hui-buttons-row"),
  attribute: () => import("../special-rows/hui-attribute-row"),
  text: () => import("../special-rows/hui-text-row"),
};
const DOMAIN_TO_ELEMENT_TYPE = {
  _domain_not_found: "simple",
  alert: "toggle",
  automation: "toggle",
  button: "button",
  climate: "climate",
  cover: "cover",
  date: "date",
  datetime: "datetime",
  event: "event",
  fan: "toggle",
  group: "group",
  humidifier: "humidifier",
  input_boolean: "toggle",
  input_button: "input-button",
  input_number: "input-number",
  input_select: "input-select",
  input_text: "input-text",
  light: "toggle",
  lock: "lock",
  media_player: "media-player",
  number: "number",
  remote: "toggle",
  scene: "scene",
  script: "script",
  select: "select",
  sensor: "sensor",
  siren: "toggle",
  switch: "toggle",
  text: "text",
  time: "time",
  timer: "timer",
  vacuum: "toggle",
  // Temporary. Once climate is rewritten,
  // water heater should get its own row.
  water_heater: "climate",
  input_datetime: "input-datetime",
  weather: "weather",
};

export const createRowElement = (config: LovelaceRowConfig) =>
  createLovelaceElement(
    "row",
    config,
    ALWAYS_LOADED_TYPES,
    LAZY_LOAD_TYPES,
    DOMAIN_TO_ELEMENT_TYPE,
    undefined
  );

export const getRowElementClass = (type: string) =>
  getLovelaceElementClass(type, "row", ALWAYS_LOADED_TYPES, LAZY_LOAD_TYPES);
