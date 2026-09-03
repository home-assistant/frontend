import {
  configEntry,
  device,
  registryEntry,
  withRegistryLinks,
} from "../helpers";
import type { ConnectivityFixtures } from "../types";

const ENTRY_ID = "mock-mqtt";

const DEVICES = [
  device(
    "mqtt-kitchen-sensor",
    "Kitchen sensor",
    "Xiaomi",
    "LYWSD03MMC",
    ENTRY_ID,
    { area_id: "kitchen" }
  ),
  device(
    "mqtt-garage-door",
    "Garage door",
    "Shelly",
    "Shelly Plus 1",
    ENTRY_ID
  ),
];

const REGISTRY_ENTRIES = [
  registryEntry(
    "sensor.kitchen_temperature",
    "mqtt-kitchen-sensor",
    ENTRY_ID,
    "mqtt"
  ),
  registryEntry(
    "sensor.kitchen_battery",
    "mqtt-kitchen-sensor",
    ENTRY_ID,
    "mqtt"
  ),
  registryEntry("cover.garage_door", "mqtt-garage-door", ENTRY_ID, "mqtt"),
];

export const mqttFixtures: ConnectivityFixtures = {
  components: ["mqtt"],
  commands: ["mqtt/"],
  configEntries: [
    {
      type: "hub",
      entry: configEntry(ENTRY_ID, "mqtt", "core-mosquitto", {
        supports_options: true,
        supports_remove_device: true,
      }),
    },
  ],
  devices: DEVICES,
  entityRegistryEntries: REGISTRY_ENTRIES,
  entities: () =>
    withRegistryLinks(REGISTRY_ENTRIES, {
      "sensor.kitchen_temperature": {
        entity_id: "sensor.kitchen_temperature",
        state: "21.4",
        attributes: {
          friendly_name: "Kitchen temperature",
          device_class: "temperature",
          state_class: "measurement",
          unit_of_measurement: "°C",
        },
      },
      "sensor.kitchen_battery": {
        entity_id: "sensor.kitchen_battery",
        state: "92",
        attributes: {
          friendly_name: "Kitchen battery",
          device_class: "battery",
          state_class: "measurement",
          unit_of_measurement: "%",
        },
      },
      "cover.garage_door": {
        entity_id: "cover.garage_door",
        state: "closed",
        attributes: { friendly_name: "Garage door", device_class: "garage" },
      },
    }),
};
