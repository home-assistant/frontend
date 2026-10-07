import type {
  EntityRegistryEntry,
  ExtEntityRegistryEntry,
} from "../../../src/data/entity/entity_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

let entries: EntityRegistryEntry[] = [];

export const mockEntityRegistry = (
  hass: MockHomeAssistant,
  data: EntityRegistryEntry[] = []
) => {
  entries = [...data];
  // A new array, so subscribers see the registry changed after an update
  hass.mockWS("config/entity_registry/list", () => [...entries]);
  hass.mockWS(
    "config/entity_registry/get_entries",
    (msg: { entity_ids: string[] }) => {
      const result: Record<string, ExtEntityRegistryEntry> = {};
      for (const entityId of msg.entity_ids) {
        const entry = entries.find((e) => e.entity_id === entityId);
        if (entry) {
          result[entityId] = { ...entry, capabilities: {}, aliases: [] };
        }
      }
      return result;
    }
  );
};

// Adds an entry like core does when an integration creates an entity
export const addEntityRegistryEntry = (
  hass: MockHomeAssistant,
  entry: Pick<EntityRegistryEntry, "entity_id" | "platform" | "unique_id">
) => {
  const now = Date.now() / 1000;
  entries = [
    ...entries.filter((e) => e.entity_id !== entry.entity_id),
    {
      config_entry_id: null,
      config_subentry_id: null,
      device_id: null,
      area_id: null,
      disabled_by: null,
      id: entry.entity_id,
      name: null,
      icon: null,
      labels: [],
      categories: {},
      hidden_by: null,
      entity_category: null,
      has_entity_name: false,
      options: null,
      created_at: now,
      modified_at: now,
      ...entry,
    },
  ];
  hass.mockEvent("entity_registry_updated");
};
