import "../entity-rows/hui-climate-entity-row";
import "../entity-rows/hui-cover-entity-row";
import "../entity-rows/hui-group-entity-row";
import "../entity-rows/hui-input-datetime-entity-row";
import "../entity-rows/hui-input-number-entity-row";
import "../entity-rows/hui-input-select-entity-row";
import "../entity-rows/hui-input-text-entity-row";
import "../entity-rows/hui-lock-entity-row";
import "../entity-rows/hui-media-player-entity-row";
import "../entity-rows/hui-person-entity-row";
import "../entity-rows/hui-scene-entity-row";
import "../entity-rows/hui-script-entity-row";
import "../entity-rows/hui-sensor-entity-row";
import "../entity-rows/hui-text-entity-row";
import "../entity-rows/hui-timer-entity-row";
import "../entity-rows/hui-toggle-entity-row";
import "../special-rows/hui-call-service-row";
import "../special-rows/hui-conditional-row";
import "../special-rows/hui-divider-row";
import "../special-rows/hui-section-row";
import "../special-rows/hui-weblink-row";
import "../special-rows/hui-cast-row";
import { EntityConfig } from "../entity-rows/types";
import { createLovelaceElement } from "./create-element-base";

const SPECIAL_TYPES = new Set([
  "call-service",
  "cast",
  "conditional",
  "divider",
  "section",
  "select",
  "weblink",
]);
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
  person: "person",
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
};

export const createRowElement = (config: EntityConfig) =>
  createLovelaceElement("row", config, SPECIAL_TYPES, DOMAIN_TO_ELEMENT_TYPE);
