import "../cards/hui-entities-card";
import "../cards/hui-button-card";
import "../cards/hui-entity-button-card";
import "../cards/hui-glance-card";
import "../cards/hui-history-graph-card";
import "../cards/hui-horizontal-stack-card";
import "../cards/hui-light-card";
import "../cards/hui-media-control-card";
import "../cards/hui-sensor-card";
import "../cards/hui-thermostat-card";
import "../cards/hui-vertical-stack-card";
import "../cards/hui-weather-forecast-card";
import { LovelaceCardConfig } from "../../../data/lovelace";
import {
  createLovelaceElement,
  getLovelaceElementClass,
} from "./create-element-base";

// lazy load imports
import "../cards/hui-alarm-panel-card";
import "../cards/hui-empty-state-card";
import "../cards/hui-entity-filter-card";
import "../cards/hui-picture-elements-card";
import "../cards/hui-picture-entity-card";
import "../cards/hui-picture-glance-card";
import "../cards/hui-plant-status-card";
import "../cards/hui-safe-mode-card";
import "../cards/hui-shopping-list-card";
import "../cards/hui-conditional-card";
import "../cards/hui-gauge-card";
import "../cards/hui-iframe-card";
import "../cards/hui-map-card";
import "../cards/hui-markdown-card";
import "../cards/hui-picture-card";

const ALWAYS_LOADED_TYPES = new Set([
  "entities",
  "button",
  "entity-button",
  "error",
  "glance",
  "history-graph",
  "horizontal-stack",
  "light",
  "media-control",
  "sensor",
  "thermostat",
  "vertical-stack",
  "weather-forecast",

  // Lazy load types
  "alarm-panel",
  "empty-state",
  "entity-filter",
  "picture-elements",
  "picture-entity",
  "picture-glance",
  "plant-status",
  "safe-mode",
  "shopping-list",
  "conditional",
  "gauge",
  "iframe",
  "map",
  "markdown",
  "picture",
]);

const LAZY_LOAD_TYPES = {
  // "alarm-panel": () => import("../cards/hui-alarm-panel-card"),
  // "empty-state": () => import("../cards/hui-empty-state-card"),
  // "entity-filter": () => import("../cards/hui-entity-filter-card"),
  // "picture-elements": () => import("../cards/hui-picture-elements-card"),
  // "picture-entity": () => import("../cards/hui-picture-entity-card"),
  // "picture-glance": () => import("../cards/hui-picture-glance-card"),
  // "plant-status": () => import("../cards/hui-plant-status-card"),
  // "safe-mode": () => import("../cards/hui-safe-mode-card"),
  // "shopping-list": () => import("../cards/hui-shopping-list-card"),
  // conditional: () => import("../cards/hui-conditional-card"),
  // gauge: () => import("../cards/hui-gauge-card"),
  // iframe: () => import("../cards/hui-iframe-card"),
  // map: () => import("../cards/hui-map-card"),
  // markdown: () => import("../cards/hui-markdown-card"),
  // picture: () => import("../cards/hui-picture-card"),
};

export const createCardElement = (config: LovelaceCardConfig) =>
  createLovelaceElement(
    "card",
    config,
    ALWAYS_LOADED_TYPES,
    LAZY_LOAD_TYPES,
    undefined,
    undefined
  );

export const getCardElementClass = (type: string) =>
  getLovelaceElementClass(type, "card", ALWAYS_LOADED_TYPES, LAZY_LOAD_TYPES);
