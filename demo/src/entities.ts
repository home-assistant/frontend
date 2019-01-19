import { getEntity } from "../../src/fake_data/entity";

export const entities = [
  getEntity("light", "bed_light", "on", {
    friendly_name: "Bed Light",
  }),
  getEntity("group", "kitchen", "on", {
    entity_id: ["light.bed_light"],
    order: 8,
    friendly_name: "Kitchen",
  }),
  getEntity("lock", "kitchen_door", "locked", {
    friendly_name: "Kitchen Door",
  }),
  getEntity("cover", "kitchen_window", "open", {
    friendly_name: "Kitchen Window",
    supported_features: 11,
  }),
  getEntity("scene", "romantic_lights", "scening", {
    entity_id: ["light.bed_light", "light.ceiling_lights"],
    friendly_name: "Romantic lights",
  }),
  getEntity("device_tracker", "demo_paulus", "home", {
    source_type: "gps",
    latitude: 32.877105,
    longitude: 117.232185,
    gps_accuracy: 91,
    battery: 71,
    friendly_name: "Paulus",
  }),
  getEntity("climate", "ecobee", "auto", {
    current_temperature: 73,
    min_temp: 45,
    max_temp: 95,
    temperature: null,
    target_temp_high: 75,
    target_temp_low: 70,
    fan_mode: "Auto Low",
    fan_list: ["On Low", "On High", "Auto Low", "Auto High", "Off"],
    operation_mode: "auto",
    operation_list: ["heat", "cool", "auto", "off"],
    hold_mode: "home",
    swing_mode: "Auto",
    swing_list: ["Auto", "1", "2", "3", "Off"],
    unit_of_measurement: "°F",
    friendly_name: "Ecobee",
    supported_features: 1014,
  }),
  getEntity("input_number", "noise_allowance", 5, {
    min: 0,
    max: 10,
    step: 1,
    mode: "slider",
    unit_of_measurement: "dB",
    friendly_name: "Allowed Noise",
    icon: "mdi:bell-ring",
  }),
];
