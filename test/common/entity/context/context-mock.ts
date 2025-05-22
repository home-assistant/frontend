import type { HassEntity } from "home-assistant-js-websocket";
import type { EntityRegistryDisplayEntry } from "../../../../src/data/entity_registry";
import type { DeviceRegistryEntry } from "../../../../src/data/device_registry";
import type { AreaRegistryEntry } from "../../../../src/data/area_registry";
import type { FloorRegistryEntry } from "../../../../src/data/floor_registry";

export const mockStateObj = (partial: Partial<HassEntity>): HassEntity => ({
  entity_id: "",
  attributes: {},
  state: "on",
  last_changed: "",
  last_updated: "",
  context: {
    id: "",
    user_id: null,
    parent_id: null,
  },
  ...partial,
});

export const mockEntity = (
  partial: Partial<EntityRegistryDisplayEntry>
): EntityRegistryDisplayEntry => ({
  entity_id: "",
  labels: [],
  ...partial,
});

export const mockDevice = (
  partial: Partial<DeviceRegistryEntry>
): DeviceRegistryEntry => ({
  id: "",
  config_entries: [],
  config_entries_subentries: {},
  connections: [],
  identifiers: [],
  manufacturer: null,
  model: null,
  model_id: null,
  name: null,
  labels: [],
  sw_version: null,
  hw_version: null,
  serial_number: null,
  via_device_id: null,
  area_id: null,
  name_by_user: null,
  entry_type: null,
  disabled_by: null,
  configuration_url: null,
  primary_config_entry: null,
  created_at: 0,
  modified_at: 0,
  ...partial,
});

export const mockArea = (
  partial: Partial<AreaRegistryEntry>
): AreaRegistryEntry => ({
  aliases: [],
  area_id: "",
  name: "",
  floor_id: null,
  created_at: 0,
  modified_at: 0,
  humidity_entity_id: null,
  temperature_entity_id: null,
  icon: null,
  labels: [],
  picture: null,
  ...partial,
});

export const mockFloor = (
  partial: Partial<FloorRegistryEntry>
): FloorRegistryEntry => ({
  aliases: [],
  floor_id: "",
  name: "",
  created_at: 0,
  modified_at: 0,
  icon: null,
  level: 0,
  ...partial,
});
