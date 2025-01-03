import type { Card } from "./types";

export const coreCards: Card[] = [
  {
    type: "alarm-panel",
    showElement: true,
  },
  {
    type: "button",
    showElement: true,
  },
  {
    type: "calendar",
    showElement: true,
  },
  {
    type: "entities",
    showElement: true,
  },
  {
    type: "entity",
    showElement: true,
  },
  {
    type: "gauge",
    showElement: true,
  },
  {
    type: "glance",
    showElement: true,
  },
  {
    type: "history-graph",
    showElement: true,
  },
  {
    type: "statistics-graph",
    showElement: false,
  },
  {
    type: "statistic",
    showElement: true,
  },
  {
    type: "humidifier",
    showElement: true,
  },
  {
    type: "light",
    showElement: true,
  },
  {
    type: "map",
    showElement: true,
  },
  {
    type: "markdown",
    showElement: true,
  },
  {
    type: "media-control",
    showElement: true,
  },
  {
    type: "picture",
    showElement: true,
  },
  {
    type: "picture-elements",
    showElement: true,
  },
  {
    type: "picture-entity",
    showElement: true,
  },
  {
    type: "picture-glance",
    showElement: true,
  },
  {
    type: "plant-status",
    showElement: true,
  },
  {
    type: "sensor",
    showElement: true,
  },
  {
    type: "thermostat",
    showElement: true,
  },
  {
    type: "weather-forecast",
    showElement: true,
  },
  {
    type: "area",
    showElement: true,
  },
  {
    type: "tile",
    showElement: true,
  },
  {
    type: "conditional",
  },
  {
    type: "entity-filter",
  },
  {
    type: "grid",
  },
  {
    type: "horizontal-stack",
  },
  {
    type: "iframe",
  },
  {
    type: "logbook",
  },
  {
    type: "vertical-stack",
  },
  {
    type: "todo-list",
  },
  {
    type: "heading",
    showElement: true,
  },
];

export const energyCards: Card[] = [
  { type: "energy-date-selection" },
  { type: "energy-usage-graph" },
  { type: "energy-solar-graph" },
  { type: "energy-solar-graph" },
  { type: "energy-gas-graph" },
  { type: "energy-water-graph" },
  { type: "energy-distribution" },
  { type: "energy-sources-table" },
  { type: "energy-grid-neutrality-gauge" },
  { type: "energy-solar-consumed-gauge" },
  { type: "energy-carbon-consumed-gauge" },
  { type: "energy-self-sufficiency-gauge" },
  { type: "energy-devices-graph" },
  { type: "energy-devices-detail-graph" },
];
