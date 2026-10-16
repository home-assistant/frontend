import { manifest } from "../../manifest";
import {
  configEntry,
  device,
  registryEntry,
  withRegistryLinks,
} from "../helpers";
import type { ConnectivityFixtures } from "../types";

export const CHIRPSTACK_ENTRY = "mock-lorawan-chirpstack";
export const TTN_ENTRY = "mock-lorawan-ttn";
export const SENSECAP_ENTRY = "mock-lorawan-sensecap";

const REGISTRY_ENTRIES = [
  registryEntry(
    "sensor.greenhouse_temperature",
    "lorawan-greenhouse",
    SENSECAP_ENTRY,
    "sensecap",
    "Temperature"
  ),
  registryEntry(
    "sensor.greenhouse_humidity",
    "lorawan-greenhouse",
    SENSECAP_ENTRY,
    "sensecap",
    "Humidity"
  ),
  registryEntry(
    "sensor.study_carbon_dioxide",
    "lorawan-study",
    SENSECAP_ENTRY,
    "sensecap",
    "Carbon dioxide"
  ),
];

export const lorawanFixtures: ConnectivityFixtures = {
  components: ["lorawan", "sensecap", "chirpstack", "thethingsnetwork_lorawan"],
  commands: ["lorawan/"],
  manifests: [
    manifest("lorawan", "LoRaWAN", { integration_type: "helper" }),
    manifest("sensecap", "SenseCAP", {
      integration_type: "device",
      dependencies: ["lorawan"],
      lorawan: [
        ["chirpstack", 744],
        ["tts", "sensecap"],
      ],
    }),
    manifest("chirpstack", "ChirpStack", { integration_type: "hub" }),
    manifest("thethingsnetwork_lorawan", "The Things Network", {
      integration_type: "hub",
    }),
  ],
  configEntries: [
    {
      type: "hub",
      entry: configEntry(CHIRPSTACK_ENTRY, "chirpstack", "Home ChirpStack"),
    },
    {
      type: "hub",
      entry: configEntry(
        TTN_ENTRY,
        "thethingsnetwork_lorawan",
        "The Things Network"
      ),
    },
    {
      type: "device",
      entry: configEntry(SENSECAP_ENTRY, "sensecap", "SenseCAP"),
    },
  ],
  devices: [
    device(
      "lorawan-greenhouse",
      "Greenhouse",
      "Seeed Studio",
      "S2101",
      SENSECAP_ENTRY,
      {
        config_entries: [SENSECAP_ENTRY, CHIRPSTACK_ENTRY],
        identifiers: [["sensecap", `${CHIRPSTACK_ENTRY}:0000000000000001`]],
      }
    ),
    device(
      "lorawan-study",
      "Study air quality",
      "Seeed Studio",
      "S2103",
      SENSECAP_ENTRY,
      {
        config_entries: [SENSECAP_ENTRY, TTN_ENTRY],
        identifiers: [["sensecap", `${TTN_ENTRY}:0000000000000002`]],
      }
    ),
  ],
  entityRegistryEntries: REGISTRY_ENTRIES,
  entities: () =>
    withRegistryLinks(REGISTRY_ENTRIES, {
      "sensor.greenhouse_temperature": {
        entity_id: "sensor.greenhouse_temperature",
        state: "24.3",
        attributes: {
          friendly_name: "Greenhouse temperature",
          device_class: "temperature",
          state_class: "measurement",
          unit_of_measurement: "°C",
        },
      },
      "sensor.greenhouse_humidity": {
        entity_id: "sensor.greenhouse_humidity",
        state: "58",
        attributes: {
          friendly_name: "Greenhouse humidity",
          device_class: "humidity",
          state_class: "measurement",
          unit_of_measurement: "%",
        },
      },
      "sensor.study_carbon_dioxide": {
        entity_id: "sensor.study_carbon_dioxide",
        state: "652",
        attributes: {
          friendly_name: "Study carbon dioxide",
          device_class: "carbon_dioxide",
          state_class: "measurement",
          unit_of_measurement: "ppm",
        },
      },
    }),
};
