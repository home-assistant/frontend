import { fireEvent } from "../../../common/dom/fire_event.js";

import "../cards/hui-alarm-panel-card.js";
import "../cards/hui-conditional-card.ts";
import "../cards/hui-entities-card.ts";
import "../cards/hui-entity-button-card.ts";
import "../cards/hui-entity-filter-card.js";
import "../cards/hui-error-card.ts";
import "../cards/hui-glance-card.ts";
import "../cards/hui-history-graph-card.js";
import "../cards/hui-horizontal-stack-card.js";
import "../cards/hui-iframe-card.ts";
import "../cards/hui-map-card.js";
import "../cards/hui-markdown-card.ts";
import "../cards/hui-media-control-card.js";
import "../cards/hui-picture-card.js";
import "../cards/hui-picture-elements-card";
import "../cards/hui-picture-entity-card";
import "../cards/hui-picture-glance-card";
import "../cards/hui-plant-status-card.js";
import "../cards/hui-sensor-card.js";
import "../cards/hui-vertical-stack-card.ts";
import "../cards/hui-thermostat-card.ts";
import "../cards/hui-weather-forecast-card";
import "../cards/hui-gauge-card.js";

import createErrorCardConfig from "./create-error-card-config.js";

const CARD_TYPES = new Set([
  "alarm-panel",
  "conditional",
  "entities",
  "entity-button",
  "entity-filter",
  "error",
  "gauge",
  "glance",
  "history-graph",
  "horizontal-stack",
  "iframe",
  "map",
  "markdown",
  "media-control",
  "picture",
  "picture-elements",
  "picture-entity",
  "picture-glance",
  "plant-status",
  "sensor",
  "thermostat",
  "vertical-stack",
  "weather-forecast",
]);
const CUSTOM_TYPE_PREFIX = "custom:";
const TIMEOUT = 2000;

function _createElement(tag, config) {
  const element = document.createElement(tag);
  try {
    element.setConfig(config);
  } catch (err) {
    // eslint-disable-next-line
    console.error(tag, err);
    // eslint-disable-next-line
    return _createErrorElement(err.message, config);
  }
  return element;
}

function _createErrorElement(error, config) {
  return _createElement("hui-error-card", createErrorCardConfig(error, config));
}

export default function createCardElement(config) {
  if (!config || typeof config !== "object" || !config.type) {
    return _createErrorElement("No card type configured.", config);
  }

  if (config.type.startsWith(CUSTOM_TYPE_PREFIX)) {
    const tag = config.type.substr(CUSTOM_TYPE_PREFIX.length);

    if (customElements.get(tag)) {
      return _createElement(tag, config);
    }
    const element = _createErrorElement(
      `Custom element doesn't exist: ${tag}.`,
      config
    );
    element.style.display = "None";
    const timer = window.setTimeout(() => {
      element.style.display = "";
    }, TIMEOUT);

    customElements.whenDefined(tag).then(() => {
      clearTimeout(timer);
      fireEvent(element, "rebuild-view");
    });

    return element;
  }

  if (!CARD_TYPES.has(config.type)) {
    return _createErrorElement(
      `Unknown card type encountered: ${config.type}.`,
      config
    );
  }

  return _createElement(`hui-${config.type}-card`, config);
}
