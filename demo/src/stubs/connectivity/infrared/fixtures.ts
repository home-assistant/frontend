import { manifest } from "../../manifest";
import {
  configEntry,
  device,
  minutesAgo,
  registryEntry,
  withRegistryLinks,
} from "../helpers";
import type { ConnectivityFixtures } from "../types";

const ENTRY_ID = "mock-broadlink";

// The commands the demo starts with. The mock pairs them with pronto codes and
// serves them as the known command database, so the receiver's event entity
// reports the same event types.
export const INFRARED_COMMAND_NAMES = ["Power", "Volume up", "Volume down"];

const DEVICES = [
  device(
    "broadlink-living-room",
    "Living room blaster",
    "Broadlink",
    "RM4 pro",
    ENTRY_ID,
    { area_id: "living_room" }
  ),
  device(
    "broadlink-bedroom",
    "Bedroom blaster",
    "Broadlink",
    "RM mini 3",
    ENTRY_ID,
    { area_id: "bedroom" }
  ),
];

// The infrared panel is entity driven: the proxy entities live in the
// `infrared` domain while their registry platform stays the integration that
// provides them.
const REGISTRY_ENTRIES = [
  registryEntry(
    "infrared.living_room_blaster_emitter",
    "broadlink-living-room",
    ENTRY_ID,
    "broadlink",
    "Emitter"
  ),
  registryEntry(
    "infrared.living_room_blaster_receiver",
    "broadlink-living-room",
    ENTRY_ID,
    "broadlink",
    "Receiver"
  ),
  registryEntry(
    "event.living_room_blaster_infrared_command",
    "broadlink-living-room",
    ENTRY_ID,
    "broadlink",
    "Infrared command"
  ),
  registryEntry(
    "infrared.bedroom_blaster_emitter",
    "broadlink-bedroom",
    ENTRY_ID,
    "broadlink",
    "Emitter"
  ),
];

export const infraredFixtures: ConnectivityFixtures = {
  components: ["infrared"],
  commands: ["infrared/"],
  manifests: [
    manifest("broadlink", "Broadlink", {
      integration_type: "hub",
      iot_class: "local_polling",
    }),
    manifest("infrared", "Infrared", {
      integration_type: "entity",
      config_flow: false,
    }),
  ],
  configEntries: [
    { type: "hub", entry: configEntry(ENTRY_ID, "broadlink", "RM4 pro") },
  ],
  devices: DEVICES,
  entityRegistryEntries: REGISTRY_ENTRIES,
  // A proxy entity's state is the timestamp it was last used.
  entities: () =>
    withRegistryLinks(REGISTRY_ENTRIES, {
      "infrared.living_room_blaster_emitter": {
        entity_id: "infrared.living_room_blaster_emitter",
        state: minutesAgo(12),
        attributes: {
          friendly_name: "Living room blaster Emitter",
          device_class: "emitter",
        },
      },
      "infrared.living_room_blaster_receiver": {
        entity_id: "infrared.living_room_blaster_receiver",
        state: minutesAgo(3),
        attributes: {
          friendly_name: "Living room blaster Receiver",
          device_class: "receiver",
        },
      },
      "event.living_room_blaster_infrared_command": {
        entity_id: "event.living_room_blaster_infrared_command",
        state: minutesAgo(3),
        attributes: {
          friendly_name: "Living room blaster Infrared command",
          event_types: INFRARED_COMMAND_NAMES,
          event_type: INFRARED_COMMAND_NAMES[0],
        },
      },
      "infrared.bedroom_blaster_emitter": {
        entity_id: "infrared.bedroom_blaster_emitter",
        state: minutesAgo(1440),
        attributes: {
          friendly_name: "Bedroom blaster Emitter",
          device_class: "emitter",
        },
      },
    }),
  backendTranslations: {
    entity_component: {
      // The emitter is the default device class, stored under the "_" key.
      "component.infrared.entity_component._.name": "Emitter",
      "component.infrared.entity_component.receiver.name": "Receiver",
    },
    entity: {
      "component.infrared.entity.event.infrared_command.name":
        "Infrared command",
    },
  },
};
