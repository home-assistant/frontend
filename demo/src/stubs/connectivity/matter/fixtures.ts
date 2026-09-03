import { manifest } from "../../manifest";
import {
  configEntry,
  device,
  registryEntry,
  withRegistryLinks,
} from "../helpers";
import type { ConnectivityFixtures } from "../types";

const ENTRY_ID = "mock-matter";

const DEVICES = [
  device(
    "matter-kitchen-light",
    "Kitchen ceiling",
    "Nanoleaf",
    "Essentials A19",
    ENTRY_ID,
    { area_id: "kitchen", sw_version: "3.5.7" }
  ),
  device(
    "matter-front-door-lock",
    "Front door lock",
    "Aqara",
    "Smart Lock U100",
    ENTRY_ID,
    { sw_version: "1.2.0" }
  ),
  device("matter-office-plug", "Office plug", "Eve", "Energy", ENTRY_ID, {
    area_id: "office",
    sw_version: "3.2.0",
  }),
  device("matter-garden-sensor", "Garden sensor", "Eve", "Weather", ENTRY_ID, {
    area_id: "garden",
    sw_version: "3.2.1",
  }),
];

const REGISTRY_ENTRIES = [
  registryEntry(
    "light.kitchen_ceiling",
    "matter-kitchen-light",
    ENTRY_ID,
    "matter"
  ),
  registryEntry(
    "lock.front_door",
    "matter-front-door-lock",
    ENTRY_ID,
    "matter"
  ),
  registryEntry("switch.office_plug", "matter-office-plug", ENTRY_ID, "matter"),
  registryEntry(
    "sensor.office_plug_power",
    "matter-office-plug",
    ENTRY_ID,
    "matter"
  ),
  registryEntry(
    "sensor.garden_temperature",
    "matter-garden-sensor",
    ENTRY_ID,
    "matter"
  ),
];

export const matterFixtures: ConnectivityFixtures = {
  components: ["matter"],
  commands: ["matter/"],
  manifests: [manifest("matter", "Matter", { integration_type: "hub" })],
  configEntries: [
    {
      type: "hub",
      entry: configEntry(ENTRY_ID, "matter", "Matter", {
        supports_remove_device: true,
      }),
    },
  ],
  devices: DEVICES,
  entityRegistryEntries: REGISTRY_ENTRIES,
  entities: () =>
    withRegistryLinks(REGISTRY_ENTRIES, {
      "light.kitchen_ceiling": {
        entity_id: "light.kitchen_ceiling",
        state: "on",
        attributes: {
          friendly_name: "Kitchen ceiling",
          supported_color_modes: ["color_temp"],
          color_mode: "color_temp",
          brightness: 204,
        },
      },
      "lock.front_door": {
        entity_id: "lock.front_door",
        state: "locked",
        attributes: { friendly_name: "Front door lock" },
      },
      "switch.office_plug": {
        entity_id: "switch.office_plug",
        state: "on",
        attributes: { friendly_name: "Office plug" },
      },
      "sensor.office_plug_power": {
        entity_id: "sensor.office_plug_power",
        state: "42.5",
        attributes: {
          friendly_name: "Office plug power",
          device_class: "power",
          state_class: "measurement",
          unit_of_measurement: "W",
        },
      },
      "sensor.garden_temperature": {
        entity_id: "sensor.garden_temperature",
        state: "14.2",
        attributes: {
          friendly_name: "Garden temperature",
          device_class: "temperature",
          state_class: "measurement",
          unit_of_measurement: "°C",
        },
      },
    }),
};
