import type { ConfigEntry } from "../../../../src/data/config_entries";
import type { DeviceRegistryEntry } from "../../../../src/data/device/device_registry";
import type { EntityRegistryEntry } from "../../../../src/data/entity/entity_registry";
import type { EntityInput } from "../../../../src/fake_data/entities/types";

// Builders for the registry fixtures, so each integration only spells out what
// makes its own entries different.

const BASE_CONFIG_ENTRY = {
  source: "user",
  state: "loaded" as const,
  supports_options: false,
  supports_remove_device: false,
  supports_unload: true,
  supports_reconfigure: true,
  supported_subentry_types: {},
  num_subentries: 0,
  pref_disable_new_entities: false,
  pref_disable_polling: false,
  disabled_by: null,
  reason: null,
  error_reason_translation_domain: null,
  error_reason_translation_key: null,
  error_reason_translation_placeholders: null,
};

export const configEntry = (
  entryId: string,
  domain: string,
  title: string,
  extra: Partial<ConfigEntry> = {}
): ConfigEntry => ({
  ...BASE_CONFIG_ENTRY,
  entry_id: entryId,
  domain,
  title,
  ...extra,
});

const BASE_DEVICE = {
  config_entries_subentries: {},
  connections: [] as [string, string][],
  identifiers: [] as [string, string][],
  model_id: null,
  labels: [] as string[],
  sw_version: null,
  hw_version: null,
  serial_number: null,
  via_device_id: null,
  area_id: null,
  name_by_user: null,
  disabled_by: null,
  configuration_url: null,
  parent_device_id: null,
  entry_type: null,
  created_at: 0,
  modified_at: 0,
};

export const device = (
  id: string,
  name: string,
  manufacturer: string,
  model: string,
  entryId: string,
  extra: Partial<DeviceRegistryEntry> = {}
): DeviceRegistryEntry => ({
  ...BASE_DEVICE,
  id,
  name,
  manufacturer,
  model,
  config_entries: [entryId],
  primary_config_entry: entryId,
  ...extra,
});

const BASE_REGISTRY_ENTRY = {
  config_subentry_id: null,
  area_id: null,
  disabled_by: null,
  icon: null,
  labels: [] as string[],
  categories: {},
  hidden_by: null,
  entity_category: null,
  options: null,
  created_at: 0,
  modified_at: 0,
};

export const registryEntry = (
  entityId: string,
  deviceId: string,
  entryId: string,
  platform: string,
  name?: string
): EntityRegistryEntry => ({
  ...BASE_REGISTRY_ENTRY,
  entity_id: entityId,
  id: entityId,
  unique_id: entityId,
  device_id: deviceId,
  config_entry_id: entryId,
  platform,
  name: name ?? null,
  has_entity_name: name === undefined,
});

/**
 * The demo's `addEntities` builds the display entity registry from the entity
 * inputs, so mirror each state's registry entry onto it. Panels count entities
 * per device and per integration.
 */
export const withRegistryLinks = (
  entries: EntityRegistryEntry[],
  states: Record<string, EntityInput>
): EntityInput[] =>
  Object.values(states).map((state) => {
    const entry = entries.find(
      (candidate) => candidate.entity_id === state.entity_id
    );
    return entry
      ? { ...state, device_id: entry.device_id!, platform: entry.platform }
      : state;
  });

export const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60000).toISOString();
