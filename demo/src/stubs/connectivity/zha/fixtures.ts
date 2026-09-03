import {
  configEntry,
  device,
  registryEntry,
  withRegistryLinks,
} from "../helpers";
import type { ConnectivityFixtures } from "../types";

const ENTRY_ID = "mock-zha";

export const COORDINATOR_IEEE = "00:12:4b:00:24:c2:e1:00";
export const PORCH_IEEE = "84:2e:14:ff:fe:11:22:33";
export const MOTION_IEEE = "cc:cc:cc:ff:fe:44:55:66";
export const PLUG_IEEE = "00:15:8d:00:03:aa:bb:cc";
export const KITCHEN_IEEE = "84:2e:14:ff:fe:aa:bb:01";
export const BEDROOM_IEEE = "00:15:8d:00:03:aa:bb:02";
export const GARAGE_IEEE = "00:15:8d:00:03:aa:bb:03";
export const OFFICE_IEEE = "00:15:8d:00:03:aa:bb:04";

const DEVICES = [
  device(
    "zha-coordinator",
    "Home Assistant Connect ZBT-1",
    "Nabu Casa",
    "Connect ZBT-1",
    ENTRY_ID,
    { sw_version: "7.4.4.0", identifiers: [["zha", COORDINATOR_IEEE]] }
  ),
  device(
    "zha-porch-light",
    "Porch light",
    "IKEA of Sweden",
    "TRADFRI bulb E27 CWS 806lm",
    ENTRY_ID,
    { identifiers: [["zha", PORCH_IEEE]] }
  ),
  device(
    "zha-hall-motion",
    "Hall motion",
    "IKEA of Sweden",
    "TRADFRI motion sensor",
    ENTRY_ID,
    { identifiers: [["zha", MOTION_IEEE]] }
  ),
  device("zha-tv-plug", "TV plug", "Innr", "SP 220", ENTRY_ID, {
    area_id: "living_room",
    identifiers: [["zha", PLUG_IEEE]],
  }),
  device(
    "zha-kitchen-switch",
    "Kitchen switch",
    "IKEA of Sweden",
    "TRADFRI on/off switch",
    ENTRY_ID,
    { area_id: "kitchen", identifiers: [["zha", KITCHEN_IEEE]] }
  ),
  device(
    "zha-bedroom-sensor",
    "Bedroom sensor",
    "Aqara",
    "WSDCGQ11LM",
    ENTRY_ID,
    { area_id: "bedroom", identifiers: [["zha", BEDROOM_IEEE]] }
  ),
  device(
    "zha-garage-contact",
    "Garage contact",
    "Aqara",
    "MCCGQ11LM",
    ENTRY_ID,
    {
      identifiers: [["zha", GARAGE_IEEE]],
    }
  ),
  device("zha-office-plug", "Office plug", "Innr", "SP 240", ENTRY_ID, {
    area_id: "office",
    identifiers: [["zha", OFFICE_IEEE]],
  }),
];

const REGISTRY_ENTRIES = [
  registryEntry("light.porch", "zha-porch-light", ENTRY_ID, "zha"),
  registryEntry(
    "binary_sensor.hall_motion",
    "zha-hall-motion",
    ENTRY_ID,
    "zha"
  ),
  registryEntry("switch.tv_plug", "zha-tv-plug", ENTRY_ID, "zha"),
  registryEntry(
    "sensor.kitchen_switch_battery",
    "zha-kitchen-switch",
    ENTRY_ID,
    "zha"
  ),
  registryEntry(
    "sensor.bedroom_temperature",
    "zha-bedroom-sensor",
    ENTRY_ID,
    "zha"
  ),
  registryEntry(
    "binary_sensor.garage_contact",
    "zha-garage-contact",
    ENTRY_ID,
    "zha"
  ),
  registryEntry("switch.office_desk", "zha-office-plug", ENTRY_ID, "zha"),
];

export const zhaFixtures: ConnectivityFixtures = {
  components: ["zha"],
  commands: ["zha/"],
  configEntries: [
    {
      type: "hub",
      entry: configEntry(ENTRY_ID, "zha", "Home Assistant Connect ZBT-1", {
        supports_options: true,
        supports_remove_device: true,
      }),
    },
  ],
  devices: DEVICES,
  entityRegistryEntries: REGISTRY_ENTRIES,
  entities: () =>
    withRegistryLinks(REGISTRY_ENTRIES, {
      "light.porch": {
        entity_id: "light.porch",
        state: "off",
        attributes: {
          friendly_name: "Porch light",
          supported_color_modes: ["hs"],
        },
      },
      "binary_sensor.hall_motion": {
        entity_id: "binary_sensor.hall_motion",
        state: "off",
        attributes: { friendly_name: "Hall motion", device_class: "motion" },
      },
      "switch.tv_plug": {
        entity_id: "switch.tv_plug",
        state: "on",
        attributes: { friendly_name: "TV plug" },
      },
      "sensor.kitchen_switch_battery": {
        entity_id: "sensor.kitchen_switch_battery",
        state: "78",
        attributes: {
          friendly_name: "Kitchen switch battery",
          device_class: "battery",
          state_class: "measurement",
          unit_of_measurement: "%",
        },
      },
      "sensor.bedroom_temperature": {
        entity_id: "sensor.bedroom_temperature",
        state: "19.6",
        attributes: {
          friendly_name: "Bedroom temperature",
          device_class: "temperature",
          state_class: "measurement",
          unit_of_measurement: "°C",
        },
      },
      "binary_sensor.garage_contact": {
        entity_id: "binary_sensor.garage_contact",
        state: "off",
        attributes: { friendly_name: "Garage contact", device_class: "door" },
      },
      "switch.office_desk": {
        entity_id: "switch.office_desk",
        state: "on",
        attributes: { friendly_name: "Office desk" },
      },
    }),
  backendTranslations: {
    config_panel: {
      "component.zha.config_panel.zha_options.title": "Global options",
      "component.zha.config_panel.zha_alarm_options.title": "Alarm options",
    },
  },
};
