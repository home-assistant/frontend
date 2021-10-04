import { Panels } from "../types";

export const demoPanels: Panels = {
  lovelace: {
    component_name: "lovelace",
    icon: null,
    title: null,
    config: { mode: "storage" },
    url_path: "lovelace",
  },
  "dev-state": {
    component_name: "dev-state",
    icon: null,
    title: null,
    config: null,
    url_path: "dev-state",
  },
  "dev-event": {
    component_name: "dev-event",
    icon: null,
    title: null,
    config: null,
    url_path: "dev-event",
  },
  "dev-template": {
    component_name: "dev-template",
    icon: null,
    title: null,
    config: null,
    url_path: "dev-template",
  },
  profile: {
    component_name: "profile",
    icon: null,
    title: null,
    config: null,
    url_path: "profile",
  },
  "dev-info": {
    component_name: "dev-info",
    icon: null,
    title: null,
    config: null,
    url_path: "dev-info",
  },
  "dev-mqtt": {
    component_name: "dev-mqtt",
    icon: null,
    title: null,
    config: null,
    url_path: "dev-mqtt",
  },
  "dev-service": {
    component_name: "dev-service",
    icon: null,
    title: null,
    config: null,
    url_path: "dev-service",
  },
  // Uncomment when we are ready to stub the history API
  // history: {
  //   component_name: "history",
  //   icon: "hass:poll-box",
  //   title: "history",
  //   config: null,
  //   url_path: "history",
  // },
  map: {
    component_name: "map",
    icon: "hass:tooltip-account",
    title: "map",
    config: null,
    url_path: "map",
  },
  energy: {
    component_name: "energy",
    icon: "hass:lightning-bolt",
    title: "energy",
    config: null,
    url_path: "energy",
  },
  // config: {
  //   component_name: "config",
  //   icon: "hass:cog",
  //   title: "config",
  //   config: null,
  //   url_path: "config",
  // },
};
