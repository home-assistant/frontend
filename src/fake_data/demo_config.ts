import { HassConfig } from "home-assistant-js-websocket";

export const demoConfig: HassConfig = {
  location_name: "Home",
  elevation: 300,
  latitude: 51.5287352,
  longitude: -0.381773,
  unit_system: {
    length: "km",
    mass: "kg",
    temperature: "°C",
    volume: "L",
  },
  components: [],
  time_zone: "America/Los_Angeles",
  config_dir: "/config",
  version: "DEMO",
  whitelist_external_dirs: [],
};
