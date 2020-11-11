import { LovelaceCardConfig } from "../../../data/lovelace";
import "../cards/hui-button-card";
import "../cards/hui-calendar-card";
import "../cards/hui-entities-card";
import "../cards/hui-entity-button-card";
import "../cards/hui-entity-card";
import "../cards/hui-glance-card";
import "../cards/hui-history-graph-card";
import "../cards/hui-horizontal-stack-card";
import "../cards/hui-light-card";
import "../cards/hui-sensor-card";
import "../cards/hui-thermostat-card";
import "../cards/hui-vertical-stack-card";
import "../cards/hui-weather-forecast-card";
import {
  createLovelaceElement,
  getLovelaceElementClass,
  tryCreateLovelaceElement,
} from "./create-element-base";

const ALWAYS_LOADED_TYPES = new Set([
  "entity",
  "entities",
  "button",
  "entity-button",
  "glance",
  "history-graph",
  "horizontal-stack",
  "light",
  "sensor",
  "thermostat",
  "vertical-stack",
  "weather-forecast",
]);

const LAZY_LOAD_TYPES = {
  "alarm-panel": () => import("../cards/hui-alarm-panel-card"),
  error: () => import("../cards/hui-error-card"),
  "empty-state": () => import("../cards/hui-empty-state-card"),
  grid: () => import("../cards/hui-grid-card"),
  starting: () => import("../cards/hui-starting-card"),
  "entity-filter": () => import("../cards/hui-entity-filter-card"),
  humidifier: () => import("../cards/hui-humidifier-card"),
  "media-control": () => import("../cards/hui-media-control-card"),
  "picture-elements": () => import("../cards/hui-picture-elements-card"),
  "picture-entity": () => import("../cards/hui-picture-entity-card"),
  "picture-glance": () => import("../cards/hui-picture-glance-card"),
  "plant-status": () => import("../cards/hui-plant-status-card"),
  "safe-mode": () => import("../cards/hui-safe-mode-card"),
  "shopping-list": () => import("../cards/hui-shopping-list-card"),
  conditional: () => import("../cards/hui-conditional-card"),
  gauge: () => import("../cards/hui-gauge-card"),
  iframe: () => import("../cards/hui-iframe-card"),
  map: () => import("../cards/hui-map-card"),
  markdown: () => import("../cards/hui-markdown-card"),
  picture: () => import("../cards/hui-picture-card"),
  calendar: () => import("../cards/hui-calendar-card"),
  logbook: () => import("../cards/hui-logbook-card"),
};

// This will not return an error card but will throw the error
export const tryCreateCardElement = (config: LovelaceCardConfig) =>
  tryCreateLovelaceElement(
    "card",
    config,
    ALWAYS_LOADED_TYPES,
    LAZY_LOAD_TYPES,
    undefined,
    undefined
  );

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
