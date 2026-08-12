import type { Connection } from "home-assistant-js-websocket";
import { createCollection } from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import { debounce } from "../common/util/debounce";
import type {
  ChildDeviceRegistryEntry,
  DeviceRegistryEntry,
  DeviceRegistryListEntry,
} from "./device/device_registry";

// A full device carries fields that stripped children never do; use one of
// those as the discriminant. This keeps "is a stripped child" decoupled from
// "has a parent", so a hypothetical full-featured sub-device would still be
// treated as a complete entry.
const isChildEntry = (
  entry: DeviceRegistryListEntry
): entry is ChildDeviceRegistryEntry => !("config_entries" in entry);

/**
 * Resolve the mixed device list from `config/device_registry/list` into a flat
 * list of complete {@link DeviceRegistryEntry} objects.
 *
 * Children are stripped over the wire and inherit the rest from their parent:
 * - config-entry association comes from the child's own `config_entry_id`, so
 *   children still show up under their integration;
 * - hardware/display fields (manufacturer, model, versions, ...) are inherited
 *   from the parent, since a child is a logical part of the same hardware;
 * - identity fields (`connections`, `via_device_id`) are NOT inherited — a
 *   child is not the parent and has no connections of its own.
 *
 * Nesting is a single level (core rejects a child as another child's parent),
 * so no recursion is needed.
 */
export const resolveChildDevices = (
  entries: DeviceRegistryListEntry[]
): DeviceRegistryEntry[] => {
  const parents = new Map<string, DeviceRegistryEntry>();
  for (const entry of entries) {
    if (!isChildEntry(entry)) {
      parents.set(entry.id, entry);
    }
  }

  return entries.map((entry) => {
    if (!isChildEntry(entry)) {
      return entry;
    }

    const parent = parents.get(entry.parent_device_id);

    return {
      // Structural fields derived from the child's own config entry.
      config_entries: [entry.config_entry_id],
      config_entries_subentries: {
        [entry.config_entry_id]: [entry.config_subentry_id],
      },
      primary_config_entry: entry.config_entry_id,
      // Hardware/display fields inherited from the parent.
      manufacturer: parent?.manufacturer ?? null,
      model: parent?.model ?? null,
      model_id: parent?.model_id ?? null,
      sw_version: parent?.sw_version ?? null,
      hw_version: parent?.hw_version ?? null,
      serial_number: parent?.serial_number ?? null,
      entry_type: parent?.entry_type ?? null,
      configuration_url: parent?.configuration_url ?? null,
      // Identity fields — a child has none of its own.
      connections: [],
      via_device_id: null,
      // The child's own fields (id, name, area_id, labels, identifiers,
      // parent_device_id, ...) win over everything above.
      ...entry,
    };
  });
};

export const fetchDeviceRegistry = (conn: Connection) =>
  conn
    .sendMessagePromise<DeviceRegistryListEntry[]>({
      type: "config/device_registry/list",
    })
    .then(resolveChildDevices);

const subscribeDeviceRegistryUpdates = (
  conn: Connection,
  store: Store<DeviceRegistryEntry[]>
) =>
  conn.subscribeEvents(
    debounce(
      () =>
        fetchDeviceRegistry(conn).then((devices) =>
          store.setState(devices, true)
        ),
      500,
      true
    ),
    "device_registry_updated"
  );

export const subscribeDeviceRegistry = (
  conn: Connection,
  onChange: (devices: DeviceRegistryEntry[]) => void
) =>
  createCollection<DeviceRegistryEntry[]>(
    "_dr",
    fetchDeviceRegistry,
    subscribeDeviceRegistryUpdates,
    conn,
    onChange
  );
