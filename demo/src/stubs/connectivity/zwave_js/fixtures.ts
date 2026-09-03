import {
  configEntry,
  device,
  registryEntry,
  withRegistryLinks,
} from "../helpers";
import type { ConnectivityFixtures } from "../types";

const ENTRY_ID = "mock-zwave-js";
export const HOME_ID = 3245146787;

// Node IDs are carried in the `zwave_js` device identifiers, which is where the
// panels read them back from.
export const CONTROLLER_NODE_ID = 1;
export const HALLWAY_NODE_ID = 7;
export const DIMMER_NODE_ID = 12;
export const MOTION_NODE_ID = 15;
export const LOCK_NODE_ID = 18;
export const THERMOSTAT_NODE_ID = 20;
export const SENSOR_NODE_ID = 23;
export const OUTLET_NODE_ID = 31;

export const DEVICE_IDS_BY_NODE_ID: Record<number, string> = {
  [CONTROLLER_NODE_ID]: "zwave-controller",
  [HALLWAY_NODE_ID]: "zwave-hallway-switch",
  [DIMMER_NODE_ID]: "zwave-dining-dimmer",
  [MOTION_NODE_ID]: "zwave-kitchen-motion",
  [LOCK_NODE_ID]: "zwave-back-door-lock",
  [THERMOSTAT_NODE_ID]: "zwave-bedroom-thermostat",
  [SENSOR_NODE_ID]: "zwave-basement-sensor",
  [OUTLET_NODE_ID]: "zwave-porch-outlet",
};

const identifiers = (nodeId: number): [string, string][] => [
  ["zwave_js", `${HOME_ID}-${nodeId}`],
];

const DEVICES = [
  device(
    "zwave-controller",
    "Z-Wave stick",
    "Zooz",
    "800 Series Z-Wave Long Range",
    ENTRY_ID,
    { sw_version: "1.10", identifiers: identifiers(CONTROLLER_NODE_ID) }
  ),
  device(
    "zwave-dining-dimmer",
    "Dining room dimmer",
    "Inovelli",
    "LZW31-SN",
    ENTRY_ID,
    { identifiers: identifiers(DIMMER_NODE_ID) }
  ),
  device("zwave-back-door-lock", "Back door lock", "Yale", "YRD226", ENTRY_ID, {
    identifiers: identifiers(LOCK_NODE_ID),
  }),
  device(
    "zwave-basement-sensor",
    "Basement sensor",
    "Aeotec",
    "ZWA005 TriSensor",
    ENTRY_ID,
    { identifiers: identifiers(SENSOR_NODE_ID) }
  ),
  device("zwave-hallway-switch", "Hallway switch", "Zooz", "ZEN76", ENTRY_ID, {
    area_id: "entrance",
    identifiers: identifiers(HALLWAY_NODE_ID),
  }),
  device(
    "zwave-kitchen-motion",
    "Kitchen motion",
    "Aeotec",
    "MultiSensor 7",
    ENTRY_ID,
    { area_id: "kitchen", identifiers: identifiers(MOTION_NODE_ID) }
  ),
  device(
    "zwave-bedroom-thermostat",
    "Bedroom thermostat",
    "Honeywell",
    "T6 Pro",
    ENTRY_ID,
    { area_id: "bedroom", identifiers: identifiers(THERMOSTAT_NODE_ID) }
  ),
  device("zwave-porch-outlet", "Porch outlet", "Zooz", "ZEN15", ENTRY_ID, {
    identifiers: identifiers(OUTLET_NODE_ID),
  }),
];

const REGISTRY_ENTRIES = [
  registryEntry(
    "light.dining_room",
    "zwave-dining-dimmer",
    ENTRY_ID,
    "zwave_js"
  ),
  registryEntry("lock.back_door", "zwave-back-door-lock", ENTRY_ID, "zwave_js"),
  registryEntry(
    "sensor.basement_humidity",
    "zwave-basement-sensor",
    ENTRY_ID,
    "zwave_js"
  ),
  registryEntry("light.hallway", "zwave-hallway-switch", ENTRY_ID, "zwave_js"),
  registryEntry(
    "binary_sensor.kitchen_motion",
    "zwave-kitchen-motion",
    ENTRY_ID,
    "zwave_js"
  ),
  registryEntry(
    "climate.bedroom",
    "zwave-bedroom-thermostat",
    ENTRY_ID,
    "zwave_js"
  ),
  registryEntry(
    "switch.porch_outlet",
    "zwave-porch-outlet",
    ENTRY_ID,
    "zwave_js"
  ),
];

export const zwaveJsFixtures: ConnectivityFixtures = {
  components: ["zwave_js"],
  commands: ["zwave_js/"],
  configEntries: [
    {
      type: "hub",
      entry: configEntry(ENTRY_ID, "zwave_js", "Z-Wave", {
        supports_options: true,
        supports_remove_device: true,
      }),
    },
  ],
  devices: DEVICES,
  entityRegistryEntries: REGISTRY_ENTRIES,
  entities: () =>
    withRegistryLinks(REGISTRY_ENTRIES, {
      "light.dining_room": {
        entity_id: "light.dining_room",
        state: "on",
        attributes: {
          friendly_name: "Dining room dimmer",
          supported_color_modes: ["brightness"],
          color_mode: "brightness",
          brightness: 128,
        },
      },
      "lock.back_door": {
        entity_id: "lock.back_door",
        state: "unlocked",
        attributes: { friendly_name: "Back door lock" },
      },
      "sensor.basement_humidity": {
        entity_id: "sensor.basement_humidity",
        state: "58",
        attributes: {
          friendly_name: "Basement humidity",
          device_class: "humidity",
          state_class: "measurement",
          unit_of_measurement: "%",
        },
      },
      "light.hallway": {
        entity_id: "light.hallway",
        state: "off",
        attributes: {
          friendly_name: "Hallway switch",
          supported_color_modes: ["onoff"],
        },
      },
      "binary_sensor.kitchen_motion": {
        entity_id: "binary_sensor.kitchen_motion",
        state: "on",
        attributes: { friendly_name: "Kitchen motion", device_class: "motion" },
      },
      "climate.bedroom": {
        entity_id: "climate.bedroom",
        state: "heat",
        attributes: {
          friendly_name: "Bedroom thermostat",
          hvac_modes: ["off", "heat"],
          current_temperature: 19.6,
          temperature: 20.5,
          min_temp: 7,
          max_temp: 30,
          supported_features: 1,
        },
      },
      "switch.porch_outlet": {
        entity_id: "switch.porch_outlet",
        state: "off",
        attributes: { friendly_name: "Porch outlet" },
      },
    }),
};
