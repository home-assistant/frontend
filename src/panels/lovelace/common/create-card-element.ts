import "../cards/hui-alarm-panel-card";
import "../cards/hui-conditional-card";
import "../cards/hui-entities-card";
import "../cards/hui-entity-button-card";
import "../cards/hui-entity-filter-card";
import "../cards/hui-glance-card";
import "../cards/hui-history-graph-card";
import "../cards/hui-horizontal-stack-card";
import "../cards/hui-iframe-card";
import "../cards/hui-light-card";
import "../cards/hui-map-card";
import "../cards/hui-markdown-card";
import "../cards/hui-media-control-card";
import "../cards/hui-picture-card";
import "../cards/hui-picture-elements-card";
import "../cards/hui-picture-entity-card";
import "../cards/hui-picture-glance-card";
import "../cards/hui-plant-status-card";
import "../cards/hui-sensor-card";
import "../cards/hui-vertical-stack-card";
import "../cards/hui-shopping-list-card";
import "../cards/hui-thermostat-card";
import "../cards/hui-weather-forecast-card";
import "../cards/hui-gauge-card";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { createLovelaceElement } from "../create-element/create-element-base";

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
  "light",
  "map",
  "markdown",
  "media-control",
  "picture",
  "picture-elements",
  "picture-entity",
  "picture-glance",
  "plant-status",
  "sensor",
  "shopping-list",
  "thermostat",
  "vertical-stack",
  "weather-forecast",
]);

export const createCardElement = (config: LovelaceCardConfig) =>
  createLovelaceElement("card", config, CARD_TYPES);
