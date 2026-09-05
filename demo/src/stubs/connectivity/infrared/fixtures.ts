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
      "infrared.bedroom_blaster_emitter": {
        entity_id: "infrared.bedroom_blaster_emitter",
        state: minutesAgo(1440),
        attributes: {
          friendly_name: "Bedroom blaster Emitter",
          device_class: "emitter",
        },
      },
    }),
  // The trigger has no fields of its own besides the captured commands, which
  // the infrared command selector renders.
  triggers: {
    infrared: {
      target: {
        entity: [{ domain: ["infrared"], device_class: ["receiver"] }],
      },
      fields: {
        commands: {
          required: true,
          selector: { infrared_command: {} },
          context: { filter_target: "target" },
        },
      },
    },
  },
  // The command names are chosen per automation, so the selector reads them
  // from the automation being edited.
  conditions: {
    infrared: {
      fields: {
        command: { required: true, selector: { infrared_command_name: {} } },
      },
    },
  },
  backendTranslations: {
    entity_component: {
      // The emitter is the default device class, stored under the "_" key.
      "component.infrared.entity_component._.name": "Emitter",
      "component.infrared.entity_component.receiver.name": "Receiver",
    },
    triggers: {
      // An integration trigger without a name of its own is keyed by "_".
      "component.infrared.triggers._.name": "Infrared command received",
      "component.infrared.triggers._.description":
        "Triggers when one of the captured infrared commands is received.",
      "component.infrared.triggers._.fields.commands.name": "Commands",
      "component.infrared.triggers._.fields.commands.description":
        "The infrared commands to trigger on. Capture a command by pressing the button on your remote, then give it a name to use it in conditions and actions.",
    },
    conditions: {
      "component.infrared.conditions._.name": "Infrared command",
      "component.infrared.conditions._.description":
        "Tests which of the infrared commands of the trigger was received.",
      "component.infrared.conditions._.fields.command.name": "Commands",
      "component.infrared.conditions._.fields.command.description":
        "The condition passes when the automation was started by one of these infrared commands.",
    },
  },
};
