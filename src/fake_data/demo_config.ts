import { HassConfig } from "home-assistant-js-websocket";

export const demoConfig: HassConfig = {
  location_name: "Home",
  elevation: 300,
  latitude: 52.3731339,
  longitude: 4.8903147,
  unit_system: {
    length: "km",
    mass: "kg",
    temperature: "°C",
    volume: "L",
  },
  components: ["notify.html5", "history", "shopping_list"],
  time_zone: "America/Los_Angeles",
  config_dir: "/config",
  version: "DEMO",
  whitelist_external_dirs: [],
  config_source: "storage",
  safe_mode: false,
};
