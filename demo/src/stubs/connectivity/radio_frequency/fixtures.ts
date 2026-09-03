import {
  configEntry,
  device,
  minutesAgo,
  registryEntry,
  withRegistryLinks,
} from "../helpers";
import type { ConnectivityFixtures } from "../types";

const ENTRY_ID = "mock-rf-bridge";

const DEVICES = [
  device(
    "rf-bridge-garage",
    "Garage bridge",
    "Sonoff",
    "RF Bridge R2",
    ENTRY_ID,
    { area_id: "garden" }
  ),
  device("rf-bridge-shed", "Shed bridge", "Sonoff", "RF Bridge R2", ENTRY_ID),
];

const REGISTRY_ENTRIES = [
  registryEntry(
    "radio_frequency.garage_bridge",
    "rf-bridge-garage",
    ENTRY_ID,
    "sonoff",
    "Transceiver"
  ),
  registryEntry(
    "radio_frequency.shed_bridge",
    "rf-bridge-shed",
    ENTRY_ID,
    "sonoff",
    "Transceiver"
  ),
];

export const radioFrequencyFixtures: ConnectivityFixtures = {
  components: ["radio_frequency"],
  commands: ["radio_frequency/"],
  configEntries: [
    { type: "hub", entry: configEntry(ENTRY_ID, "sonoff", "RF Bridge") },
  ],
  devices: DEVICES,
  entityRegistryEntries: REGISTRY_ENTRIES,
  // A transceiver's state is the timestamp it was last used.
  entities: () =>
    withRegistryLinks(REGISTRY_ENTRIES, {
      "radio_frequency.garage_bridge": {
        entity_id: "radio_frequency.garage_bridge",
        state: minutesAgo(47),
        attributes: { friendly_name: "Garage bridge Transceiver" },
      },
      "radio_frequency.shed_bridge": {
        entity_id: "radio_frequency.shed_bridge",
        state: "unknown",
        attributes: { friendly_name: "Shed bridge Transceiver" },
      },
    }),
  backendTranslations: {
    entity_component: {
      "component.radio_frequency.entity_component._.name": "Transceiver",
    },
  },
};
