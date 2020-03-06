import "../entity-rows/hui-media-player-entity-row";
import "../entity-rows/hui-scene-entity-row";
import "../entity-rows/hui-script-entity-row";
import "../entity-rows/hui-sensor-entity-row";
import "../entity-rows/hui-text-entity-row";
import "../entity-rows/hui-toggle-entity-row";
import "../special-rows/hui-call-service-row";
import { EntityConfig } from "../entity-rows/types";
import { createLovelaceElement } from "./create-element-base";

const ALWAYS_LOADED_TYPES = new Set([
  "media-player-entity",
  "scene-entity",
  "script-entity",
  "sensor-entity",
  "text-entity",
  "toggle-entity",
  "call-service",
]);
const LAZY_LOAD_TYPES = {
  "climate-entity": () => import("../entity-rows/hui-climate-entity-row"),
  "cover-entity": () => import("../entity-rows/hui-cover-entity-row"),
  "group-entity": () => import("../entity-rows/hui-group-entity-row"),
  "input-datetime-entity": () =>
    import("../entity-rows/hui-input-datetime-entity-row"),
  "input-number-entity": () =>
    import("../entity-rows/hui-input-number-entity-row"),
  "input-select-entity": () =>
    import("../entity-rows/hui-input-select-entity-row"),
  "input-text-entity": () => import("../entity-rows/hui-input-text-entity-row"),
  "lock-entity": () => import("../entity-rows/hui-lock-entity-row"),
  "timer-entity": () => import("../entity-rows/hui-timer-entity-row"),
  conditional: () => import("../special-rows/hui-conditional-row"),
  "weather-entity": () => import("../entity-rows/hui-weather-entity-row"),
  divider: () => import("../special-rows/hui-divider-row"),
  section: () => import("../special-rows/hui-section-row"),
  weblink: () => import("../special-rows/hui-weblink-row"),
  cast: () => import("../special-rows/hui-cast-row"),
};
const DOMAIN_TO_ELEMENT_TYPE = {
  _domain_not_found: "text",
  alert: "toggle",
  automation: "toggle",
  climate: "climate",
  cover: "cover",
  fan: "toggle",
  group: "group",
  input_boolean: "toggle",
  input_number: "input-number",
  input_select: "input-select",
  input_text: "input-text",
  light: "toggle",
  lock: "lock",
  media_player: "media-player",
  remote: "toggle",
  scene: "scene",
  script: "script",
  sensor: "sensor",
  timer: "timer",
  switch: "toggle",
  vacuum: "toggle",
  // Temporary. Once climate is rewritten,
  // water heater should get it's own row.
  water_heater: "climate",
  input_datetime: "input-datetime",
  weather: "weather",
};

export const createRowElement = (config: EntityConfig) =>
  createLovelaceElement(
    "row",
    config,
    ALWAYS_LOADED_TYPES,
    LAZY_LOAD_TYPES,
    DOMAIN_TO_ELEMENT_TYPE,
    undefined
  );
