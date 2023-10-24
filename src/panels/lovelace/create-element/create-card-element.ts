import { LovelaceCardConfig } from "../../../data/lovelace";
import "../cards/hui-button-card";
import "../cards/hui-calendar-card";
import "../cards/hui-entities-card";
import "../cards/hui-entity-button-card";
import "../cards/hui-entity-card";
import "../cards/hui-glance-card";
import "../cards/hui-grid-card";
import "../cards/hui-light-card";
import "../cards/hui-sensor-card";
import "../cards/hui-thermostat-card";
import "../cards/hui-weather-forecast-card";
import "../cards/hui-tile-card";
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
  "grid",
  "light",
  "sensor",
  "thermostat",
  "weather-forecast",
  "tile",
]);

const LAZY_LOAD_TYPES = {
  "alarm-panel": () => import("../cards/hui-alarm-panel-card"),
  area: () => import("../cards/hui-area-card"),
  calendar: () => import("../cards/hui-calendar-card"),
  conditional: () => import("../cards/hui-conditional-card"),
  "empty-state": () => import("../cards/hui-empty-state-card"),
  "energy-compare": () => import("../cards/energy/hui-energy-compare-card"),
  "energy-carbon-consumed-gauge": () =>
    import("../cards/energy/hui-energy-carbon-consumed-gauge-card"),
  "energy-date-selection": () =>
    import("../cards/energy/hui-energy-date-selection-card"),
  "energy-devices-graph": () =>
    import("../cards/energy/hui-energy-devices-graph-card"),
  "energy-distribution": () =>
    import("../cards/energy/hui-energy-distribution-card"),
  "energy-gas-graph": () => import("../cards/energy/hui-energy-gas-graph-card"),
  "energy-water-graph": () =>
    import("../cards/energy/hui-energy-water-graph-card"),
  "energy-grid-neutrality-gauge": () =>
    import("../cards/energy/hui-energy-grid-neutrality-gauge-card"),
  "energy-solar-consumed-gauge": () =>
    import("../cards/energy/hui-energy-solar-consumed-gauge-card"),
  "energy-self-sufficiency-gauge": () =>
    import("../cards/energy/hui-energy-self-sufficiency-gauge-card"),
  "energy-solar-graph": () =>
    import("../cards/energy/hui-energy-solar-graph-card"),
  "energy-sources-table": () =>
    import("../cards/energy/hui-energy-sources-table-card"),
  "energy-usage-graph": () =>
    import("../cards/energy/hui-energy-usage-graph-card"),
  "entity-filter": () => import("../cards/hui-entity-filter-card"),
  error: () => import("../cards/hui-error-card"),
  gauge: () => import("../cards/hui-gauge-card"),
  "history-graph": () => import("../cards/hui-history-graph-card"),
  "horizontal-stack": () => import("../cards/hui-horizontal-stack-card"),
  humidifier: () => import("../cards/hui-humidifier-card"),
  iframe: () => import("../cards/hui-iframe-card"),
  logbook: () => import("../cards/hui-logbook-card"),
  map: () => import("../cards/hui-map-card"),
  markdown: () => import("../cards/hui-markdown-card"),
  "media-control": () => import("../cards/hui-media-control-card"),
  "picture-elements": () => import("../cards/hui-picture-elements-card"),
  "picture-entity": () => import("../cards/hui-picture-entity-card"),
  "picture-glance": () => import("../cards/hui-picture-glance-card"),
  picture: () => import("../cards/hui-picture-card"),
  "plant-status": () => import("../cards/hui-plant-status-card"),
  "recovery-mode": () => import("../cards/hui-recovery-mode-card"),
  "todo-list": () => import("../cards/hui-todo-list-card"),
  "shopping-list": () => import("../cards/hui-shopping-list-card"),
  starting: () => import("../cards/hui-starting-card"),
  "statistics-graph": () => import("../cards/hui-statistics-graph-card"),
  statistic: () => import("../cards/hui-statistic-card"),
  "vertical-stack": () => import("../cards/hui-vertical-stack-card"),
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
