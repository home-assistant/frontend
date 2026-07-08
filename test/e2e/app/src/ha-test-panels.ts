import type { PanelInfo } from "../../../../src/types";

interface E2ETestPanelInfo extends PanelInfo {
  testSelector?: string;
}

export const e2eTestPanels: Record<string, E2ETestPanelInfo> = {
  home: {
    component_name: "home",
    icon: "mdi:home",
    title: "home",
    config: null,
    url_path: "home",
    testSelector: "ha-panel-home",
  },
  lovelace: {
    component_name: "lovelace",
    icon: "mdi:view-dashboard",
    title: "home",
    config: { mode: "storage" },
    url_path: "lovelace",
    testSelector: "ha-panel-lovelace, hui-root",
  },
  map: {
    component_name: "lovelace",
    icon: "mdi:tooltip-account",
    title: "map",
    config: { mode: "storage" },
    url_path: "map",
    testSelector: "ha-panel-lovelace, hui-root",
  },
  energy: {
    component_name: "energy",
    icon: "mdi:lightning-bolt",
    title: "energy",
    config: null,
    url_path: "energy",
    testSelector: "ha-panel-energy, energy-view",
  },
  history: {
    component_name: "history",
    icon: "mdi:chart-box",
    title: "history",
    config: null,
    url_path: "history",
    testSelector: "ha-panel-history, history-panel",
  },
  logbook: {
    component_name: "logbook",
    icon: "mdi:format-list-bulleted-type",
    title: "logbook",
    config: null,
    url_path: "logbook",
    testSelector: "ha-panel-logbook",
  },
  calendar: {
    component_name: "calendar",
    icon: "mdi:calendar",
    title: "calendar",
    config: null,
    url_path: "calendar",
    testSelector: "ha-panel-calendar",
  },
  todo: {
    component_name: "e2e-todo",
    icon: "mdi:clipboard-list",
    title: "todo",
    config: null,
    url_path: "todo",
    testSelector: "ha-panel-e2e-todo",
  },
  "media-browser": {
    component_name: "media-browser",
    icon: "mdi:play-box-multiple",
    title: "media_browser",
    config: null,
    url_path: "media-browser",
    testSelector: "ha-panel-media-browser",
  },
  light: {
    component_name: "light",
    icon: "mdi:lightbulb-group",
    title: "light",
    config: null,
    url_path: "light",
    testSelector: "ha-panel-light",
  },
  climate: {
    component_name: "climate",
    icon: "mdi:thermostat",
    title: "climate",
    config: null,
    url_path: "climate",
    testSelector: "ha-panel-climate",
  },
  maintenance: {
    component_name: "maintenance",
    icon: "mdi:wrench-clock",
    title: "maintenance",
    config: null,
    url_path: "maintenance",
    testSelector: "ha-panel-maintenance",
  },
  iframe: {
    component_name: "iframe",
    icon: "mdi:web",
    title: "iframe",
    config: { url: "/static/blank.html" },
    url_path: "iframe",
    testSelector: "ha-panel-iframe",
  },
  config: {
    component_name: "config",
    icon: "mdi:cog",
    title: "config",
    config: null,
    url_path: "config",
  },
  profile: {
    component_name: "profile",
    icon: null,
    title: null,
    config: null,
    url_path: "profile",
    testSelector: "ha-panel-profile, ha-config-user-profile",
  },
  notfound: {
    component_name: "notfound",
    icon: null,
    title: null,
    config: null,
    url_path: "notfound",
    testSelector: "ha-panel-notfound",
  },
};

export const e2ePanelRouteAssertions = new Map<string, string>(
  Object.values(e2eTestPanels).flatMap((panel): [string, string][] =>
    panel.testSelector ? [[`/${panel.url_path}`, panel.testSelector]] : []
  )
);
