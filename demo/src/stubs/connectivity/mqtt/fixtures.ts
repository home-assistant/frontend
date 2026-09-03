import { manifest } from "../../manifest";
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
    "mqtt-fridge-sensor",
    "Fridge sensor",
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
    "sensor.fridge_temperature",
    "mqtt-fridge-sensor",
    ENTRY_ID,
    "mqtt"
  ),
  registryEntry(
    "sensor.fridge_battery",
    "mqtt-fridge-sensor",
    ENTRY_ID,
    "mqtt"
  ),
  registryEntry("cover.garage_door", "mqtt-garage-door", ENTRY_ID, "mqtt"),
];

export const mqttFixtures: ConnectivityFixtures = {
  components: ["mqtt"],
  commands: ["mqtt/"],
  manifests: [manifest("mqtt", "MQTT", { integration_type: "hub" })],
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
      "sensor.fridge_temperature": {
        entity_id: "sensor.fridge_temperature",
        state: "21.4",
        attributes: {
          friendly_name: "Fridge temperature",
          device_class: "temperature",
          state_class: "measurement",
          unit_of_measurement: "°C",
        },
      },
      "sensor.fridge_battery": {
        entity_id: "sensor.fridge_battery",
        state: "92",
        attributes: {
          friendly_name: "Fridge battery",
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
