import type { Connection } from "home-assistant-js-websocket";
import { computeStateName } from "../../common/entity/compute_state_name";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import type { HomeAssistant } from "../../types";
import type { ConfigEntry } from "../config_entries";
import type {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
} from "../entity/entity_registry";
import type { EntitySources } from "../entity/entity_sources";
import type { RegistryEntry } from "../registry";

export {
  fetchDeviceRegistry,
  subscribeDeviceRegistry,
} from "../ws-device_registry";

export type DeviceDisabler =
  | "user"
  | "integration"
  | "config_entry"
  // The device's parent device is disabled (child devices only).
  | "device";

export interface DeviceRegistryEntry extends RegistryEntry {
  id: string;
  config_entries: string[];
  config_entries_subentries: Record<string, (string | null)[]>;
  connections: [string, string][];
  identifiers: [string, string][];
  manufacturer: string | null;
  model: string | null;
  model_id: string | null;
  name: string | null;
  labels: string[];
  sw_version: string | null;
  hw_version: string | null;
  serial_number: string | null;
  via_device_id: string | null;
  area_id: string | null;
  name_by_user: string | null;
  entry_type: "service" | null;
  disabled_by: DeviceDisabler | null;
  configuration_url: string | null;
  primary_config_entry: string | null;
  // Set when this device is a child (logical part) of another device.
  // null for regular top-level devices.
  parent_device_id: string | null;
}

/**
 * A child device as it arrives over the wire from
 * `config/device_registry/list`. A child is a lightweight logical part of a
 * parent device (e.g. an outlet of a power strip); it only carries its own
 * fields and inherits the rest from its parent. It is never stored in
 * `hass.devices` in this shape — {@link resolveChildDevices} turns every child
 * into a complete {@link DeviceRegistryEntry} at ingestion, so downstream code
 * only ever sees full device entries.
 */
export interface ChildDeviceRegistryEntry extends RegistryEntry {
  id: string;
  config_entry_id: string;
  config_subentry_id: string | null;
  identifiers: [string, string][];
  name: string | null;
  name_by_user: string | null;
  labels: string[];
  area_id: string | null;
  disabled_by: DeviceDisabler | null;
  parent_device_id: string;
}

/**
 * The raw, mixed list returned by `config/device_registry/list`: full devices
 * and stripped children, discriminated by the presence of full-device fields.
 */
export type DeviceRegistryListEntry =
  DeviceRegistryEntry | ChildDeviceRegistryEntry;

/** Whether a resolved device entry is a child (logical part) of another device. */
export const isChildDevice = (device: DeviceRegistryEntry): boolean =>
  device.parent_device_id !== null;

export interface DeviceRowItem {
  device: DeviceRegistryEntry;
  isChild: boolean;
}

/**
 * Order a flat device list so each child directly follows its parent, flagging
 * children for indented rendering. The incoming order of the top-level devices
 * (and of the children within each parent) is preserved. A child whose parent
 * is not in the list is treated as a top-level device.
 */
export const groupDevicesByParent = (
  devices: DeviceRegistryEntry[]
): DeviceRowItem[] => {
  const presentIds = new Set(devices.map((device) => device.id));
  const childrenByParent = new Map<string, DeviceRegistryEntry[]>();
  const topLevel: DeviceRegistryEntry[] = [];

  for (const device of devices) {
    const parentId = device.parent_device_id;
    if (parentId && presentIds.has(parentId)) {
      const siblings = childrenByParent.get(parentId);
      if (siblings) {
        siblings.push(device);
      } else {
        childrenByParent.set(parentId, [device]);
      }
    } else {
      topLevel.push(device);
    }
  }

  const result: DeviceRowItem[] = [];
  for (const device of topLevel) {
    result.push({ device, isChild: false });
    for (const child of childrenByParent.get(device.id) ?? []) {
      result.push({ device: child, isChild: true });
    }
  }
  return result;
};

export type DeviceEntityDisplayLookup = Record<
  string,
  EntityRegistryDisplayEntry[]
>;

export type DeviceEntityLookup<
  T extends EntityRegistryEntry | EntityRegistryDisplayEntry =
    EntityRegistryEntry | EntityRegistryDisplayEntry,
> = Record<string, T[]>;

export interface DeviceRegistryEntryMutableParams {
  area_id?: string | null;
  name_by_user?: string | null;
  disabled_by?: string | null;
  labels?: string[];
}

/**
 * Describes how a legacy composite device (that lived on multiple config
 * entries) was split into separate devices. The composite device no longer
 * exists in the registry; references to it (in automations, targets, ...) now
 * need to point at one or more of the split devices instead.
 */
export interface DeviceCompositeSplit {
  /** Ids of the devices that replaced the composite device. */
  split_ids: string[];
  /** The split device that took over the composite's primary config entry. */
  primary_id: string | null;
}

/** Map of removed composite device id -> its split information. */
export type DeviceCompositeSplits = Record<string, DeviceCompositeSplit>;

// The composite split migration in core is a one-time operation, so the split
// map is static for the lifetime of the connection. Cache the request per
// connection so it is fetched once and shared across all pickers, instead of
// being requested again by every device/target picker.
const compositeSplitsCache = new WeakMap<
  Connection,
  Promise<DeviceCompositeSplits>
>();

export const fetchDeviceCompositeSplits = (
  hass: Pick<HomeAssistant, "connection" | "callWS">
): Promise<DeviceCompositeSplits> => {
  const conn = hass.connection;

  let request = compositeSplitsCache.get(conn);
  if (!request) {
    request = hass
      .callWS<DeviceCompositeSplits>({
        type: "config/device_registry/list_composite_splits",
      })
      .catch((err) => {
        // Don't cache failures so the next caller retries.
        compositeSplitsCache.delete(conn);
        throw err;
      });
    compositeSplitsCache.set(conn, request);
  }
  return request;
};

/**
 * Fetch the devices that are linked to the given device because they share at
 * least one connection or identifier. These are separate devices (one per
 * config entry) that represent the same physical hardware, managed by
 * different integrations.
 */
export const fetchLinkedDevices = (
  hass: Pick<HomeAssistant, "callWS">,
  deviceId: string
): Promise<string[]> =>
  hass
    .callWS<{ linked_devices: string[] }>({
      type: "config/device_registry/list_linked_devices",
      device_id: deviceId,
    })
    .then((result) => result.linked_devices);

export const fallbackDeviceName = (
  hass: HomeAssistant,
  entities: EntityRegistryEntry[] | EntityRegistryDisplayEntry[] | string[]
) => {
  for (const entity of entities || []) {
    const entityId = typeof entity === "string" ? entity : entity.entity_id;
    const stateObj = hass.states[entityId];
    if (stateObj) {
      return computeStateName(stateObj);
    }
  }
  return undefined;
};

export const devicesInArea = (devices: DeviceRegistryEntry[], areaId: string) =>
  devices.filter((device) => device.area_id === areaId);

export const updateDeviceRegistryEntry = (
  hass: HomeAssistant,
  deviceId: string,
  updates: Partial<DeviceRegistryEntryMutableParams>
) =>
  hass.callWS<DeviceRegistryEntry>({
    type: "config/device_registry/update",
    device_id: deviceId,
    ...updates,
  });

export const removeDeviceFromRegistry = (
  hass: HomeAssistant,
  deviceId: string
) =>
  hass.callWS<null>({
    type: "config/device_registry/remove",
    device_id: deviceId,
  });

export const sortDeviceRegistryByName = (
  entries: DeviceRegistryEntry[],
  language: string
) =>
  entries.sort((entry1, entry2) =>
    caseInsensitiveStringCompare(entry1.name || "", entry2.name || "", language)
  );

export const getDeviceEntityLookup = (
  entities: (EntityRegistryEntry | EntityRegistryDisplayEntry)[]
): DeviceEntityLookup => {
  const deviceEntityLookup: DeviceEntityLookup = {};
  for (const entity of entities) {
    if (!entity.device_id) {
      continue;
    }
    if (!(entity.device_id in deviceEntityLookup)) {
      deviceEntityLookup[entity.device_id] = [];
    }
    deviceEntityLookup[entity.device_id].push(entity);
  }
  return deviceEntityLookup;
};

export const getDeviceEntityDisplayLookup = (
  entities: EntityRegistryDisplayEntry[]
): DeviceEntityDisplayLookup => {
  const deviceEntityLookup: DeviceEntityDisplayLookup = {};
  for (const entity of entities) {
    if (!entity.device_id) {
      continue;
    }
    if (!(entity.device_id in deviceEntityLookup)) {
      deviceEntityLookup[entity.device_id] = [];
    }
    deviceEntityLookup[entity.device_id].push(entity);
  }
  return deviceEntityLookup;
};

export const getDeviceIntegrationLookup = (
  entitySources: EntitySources,
  entities: EntityRegistryDisplayEntry[] | EntityRegistryEntry[],
  devices?: DeviceRegistryEntry[],
  configEntries?: ConfigEntry[]
): Record<string, Set<string>> => {
  const deviceIntegrations: Record<string, Set<string>> = {};

  for (const entity of entities) {
    const source = entitySources[entity.entity_id];
    if (!source?.domain || entity.device_id === null) {
      continue;
    }

    deviceIntegrations[entity.device_id!] =
      deviceIntegrations[entity.device_id!] || new Set<string>();
    deviceIntegrations[entity.device_id!].add(source.domain);
  }
  // Lookup devices that have no entities
  if (devices && configEntries) {
    for (const device of devices) {
      for (const config_entry_id of device.config_entries) {
        const entry = configEntries.find((e) => e.entry_id === config_entry_id);
        if (entry?.domain) {
          deviceIntegrations[device.id] =
            deviceIntegrations[device.id] || new Set<string>();
          deviceIntegrations[device.id].add(entry.domain);
        }
      }
    }
  }
  return deviceIntegrations;
};
