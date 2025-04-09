import type { HassConfig } from "home-assistant-js-websocket";

import { STATE_RUNNING } from "home-assistant-js-websocket";

export const demoConfig: HassConfig = {
  location_name: "Home",
  elevation: 300,
  latitude: 52.3731339,
  longitude: 4.8903147,
  radius: 100,
  unit_system: {
    length: "km",
    mass: "kg",
    temperature: "°C",
    volume: "L",
    pressure: "Pa",
    wind_speed: "m/s",
    accumulated_precipitation: "mm",
  },
  components: [
    "notify.html5",
    "history",
    "forecast_solar",
    "energy",
    "person",
    "number",
    "select",
    "tts",
    "datetime",
    "vacuum",
    "wake_word",
    "light",
    "alarm_control_panel",
    "text",
    "lawn_mower",
    "siren",
    "input_boolean",
    "lock",
    "calendar",
    "image",
    "device_tracker",
    "scene",
    "script",
    "todo",
    "cover",
    "switch",
    "button",
    "water_heater",
    "binary_sensor",
    "sensor",
    "humidifier",
    "valve",
    "time",
    "media_player",
    "air_quality",
    "camera",
    "date",
    "fan",
    "automation",
    "weather",
    "climate",
    "stt",
    "update",
    "event",
    "demo",
  ],
  time_zone: "America/Los_Angeles",
  config_dir: "/config",
  version: "DEMO",
  allowlist_external_dirs: [],
  allowlist_external_urls: [],
  config_source: "storage",
  recovery_mode: false,
  safe_mode: false,
  state: STATE_RUNNING,
  internal_url: "http://homeassistant.local:8123",
  external_url: null,
  currency: "USD",
  language: "en",
  country: "NL",
};
