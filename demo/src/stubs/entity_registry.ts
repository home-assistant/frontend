import type {
  EntityRegistryEntry,
  ExtEntityRegistryEntry,
  UpdateEntityRegistryEntryResult,
} from "../../../src/data/entity/entity_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

let entries: EntityRegistryEntry[] = [];

const newEntry = (
  entry: Pick<EntityRegistryEntry, "entity_id" | "platform" | "unique_id">
): EntityRegistryEntry => {
  const now = Date.now() / 1000;
  return {
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
  };
};

const extEntry = (entry: EntityRegistryEntry): ExtEntityRegistryEntry => ({
  ...entry,
  capabilities: {},
  aliases: [],
});

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
          result[entityId] = extEntry(entry);
        }
      }
      return result;
    }
  );
  hass.mockWS(
    "config/entity_registry/update",
    (
      msg: Pick<
        EntityRegistryEntry,
        | "entity_id"
        | "name"
        | "icon"
        | "area_id"
        | "labels"
        | "categories"
        | "hidden_by"
        | "disabled_by"
      >,
      currentHass: MockHomeAssistant
    ): UpdateEntityRegistryEntryResult => {
      const { entity_id: entityId, ...updates } = msg;
      // The demo entities without an entry get one, like any core entity has
      const entry = {
        ...(entries.find((e) => e.entity_id === entityId) ??
          newEntry({
            entity_id: entityId,
            platform: currentHass.entities[entityId]?.platform ?? "demo",
            unique_id: entityId,
          })),
        ...Object.fromEntries(
          Object.entries(updates).filter(([key]) => key !== "type")
        ),
        modified_at: Date.now() / 1000,
      };
      entries = [...entries.filter((e) => e.entity_id !== entityId), entry];
      currentHass.mockEvent("entity_registry_updated");
      return { entity_entry: extEntry(entry) };
    }
  );
};

// Adds an entry like core does when an integration creates an entity
export const addEntityRegistryEntry = (
  hass: MockHomeAssistant,
  entry: Pick<EntityRegistryEntry, "entity_id" | "platform" | "unique_id">
) => {
  entries = [
    ...entries.filter((e) => e.entity_id !== entry.entity_id),
    newEntry(entry),
  ];
  hass.mockEvent("entity_registry_updated");
};
