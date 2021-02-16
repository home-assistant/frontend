import { HassConfig, STATE_RUNNING } from "home-assistant-js-websocket";

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
  allowlist_external_dirs: [],
  allowlist_external_urls: [],
  config_source: "storage",
  safe_mode: false,
  state: STATE_RUNNING,
  internal_url: "http://homeassistant.local:8123",
  external_url: null,
};
