import type { Panels } from "../../../../src/types";

export const e2eTestPanels: Panels = {
  lovelace: {
    component_name: "lovelace",
    icon: "mdi:view-dashboard",
    title: "home",
    config: { mode: "storage" },
    url_path: "lovelace",
  },
  map: {
    component_name: "lovelace",
    icon: "mdi:tooltip-account",
    title: "map",
    config: { mode: "storage" },
    url_path: "map",
  },
  energy: {
    component_name: "energy",
    icon: "mdi:lightning-bolt",
    title: "energy",
    config: null,
    url_path: "energy",
  },
  history: {
    component_name: "history",
    icon: "mdi:chart-box",
    title: "history",
    config: null,
    url_path: "history",
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
  },
  "developer-tools": {
    component_name: "developer-tools",
    icon: "mdi:hammer",
    title: "developer_tools",
    config: null,
    url_path: "developer-tools",
  },
};
