import deepClone from "deep-clone-simple";

import { fireEvent } from "../../../common/dom/fire_event";

import {
  createErrorCardElement,
  createErrorCardConfig,
  HuiErrorCard,
} from "../cards/hui-error-card";
import "../entity-rows/hui-climate-entity-row";
import "../entity-rows/hui-cover-entity-row";
import "../entity-rows/hui-group-entity-row";
import "../entity-rows/hui-input-number-entity-row";
import "../entity-rows/hui-input-select-entity-row";
import "../entity-rows/hui-input-text-entity-row";
import "../entity-rows/hui-lock-entity-row";
import "../entity-rows/hui-media-player-entity-row";
import "../entity-rows/hui-scene-entity-row";
import "../entity-rows/hui-script-entity-row";
import "../entity-rows/hui-sensor-entity-row";
import "../entity-rows/hui-text-entity-row";
import "../entity-rows/hui-timer-entity-row";
import "../entity-rows/hui-toggle-entity-row";
import "../special-rows/hui-call-service-row";
import "../special-rows/hui-divider-row";
import "../special-rows/hui-section-row";
import "../special-rows/hui-weblink-row";
import { EntityConfig, EntityRow } from "../entity-rows/types";

const CUSTOM_TYPE_PREFIX = "custom:";
const SPECIAL_TYPES = new Set([
  "call-service",
  "divider",
  "section",
  "weblink",
]);
const DOMAIN_TO_ELEMENT_TYPE = {
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
};
const TIMEOUT = 2000;

const _createElement = (
  tag: string,
  config: EntityConfig
): EntityRow | HuiErrorCard => {
  const element = document.createElement(tag) as EntityRow;
  try {
    element.setConfig(deepClone(config));
  } catch (err) {
    // tslint:disable-next-line
    console.error(tag, err);
    return _createErrorElement(err.message, config);
  }

  return element;
};

const _createErrorElement = (
  error: string,
  config: EntityConfig
): HuiErrorCard => createErrorCardElement(createErrorCardConfig(error, config));

const _hideErrorElement = (element) => {
  element.style.display = "None";
  return window.setTimeout(() => {
    element.style.display = "";
  }, TIMEOUT);
};

export const createRowElement = (
  config: EntityConfig
): EntityRow | HuiErrorCard => {
  let tag;

  if (
    !config ||
    typeof config !== "object" ||
    (!config.entity && !config.type)
  ) {
    return _createErrorElement("Invalid config given.", config);
  }

  const type = config.type || "default";
  if (SPECIAL_TYPES.has(type)) {
    return _createElement(`hui-${type}-row`, config);
  }

  if (type.startsWith(CUSTOM_TYPE_PREFIX)) {
    tag = type.substr(CUSTOM_TYPE_PREFIX.length);

    if (customElements.get(tag)) {
      return _createElement(tag, config);
    }
    const element = _createErrorElement(
      `Custom element doesn't exist: ${tag}.`,
      config
    );
    const timer = _hideErrorElement(element);

    customElements.whenDefined(tag).then(() => {
      clearTimeout(timer);
      fireEvent(element, "ll-rebuild");
    });

    return element;
  }

  const domain = config.entity.split(".", 1)[0];
  tag = `hui-${DOMAIN_TO_ELEMENT_TYPE[domain] || "text"}-entity-row`;

  return _createElement(tag, config);
};
