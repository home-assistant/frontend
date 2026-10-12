import type {
  EntityRegistryDisplayEntryResponse,
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

// The registry settings that the display registry holds. A display entry
// without a registry name shows the name of its state.
const displayFields = (entry: EntityRegistryEntry) => ({
  ...(entry.name && { name: entry.name }),
  icon: entry.icon ?? undefined,
  area_id: entry.area_id ?? undefined,
  labels: entry.labels,
  hidden: entry.hidden_by !== null,
});

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
      > & { new_entity_id?: string },
      currentHass: MockHomeAssistant
    ): UpdateEntityRegistryEntryResult => {
      const {
        entity_id: entityId,
        new_entity_id: newEntityId,
        ...updates
      } = msg;
      // Renaming would have to move the entity in every mock, so refuse it
      // instead of reporting a rename that did not happen
      if (newEntityId && newEntityId !== entityId) {
        throw new Error("Changing the entity ID is not supported in the demo");
      }
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
      // Core updates the display registry too, only change what was updated
      const display = currentHass.entities[entityId];
      if (display) {
        const fields = displayFields(entry);
        currentHass.updateHass({
          entities: {
            ...currentHass.entities,
            [entityId]: {
              ...display,
              ...("name" in updates && { name: fields.name }),
              ...("icon" in updates && { icon: fields.icon }),
              ...("area_id" in updates && { area_id: fields.area_id }),
              ...("labels" in updates && { labels: fields.labels }),
              ...("hidden_by" in updates && { hidden: fields.hidden }),
            },
          },
        });
      }
      currentHass.mockEvent("entity_registry_updated");
      return { entity_entry: extEntry(entry) };
    }
  );
};

// Entries of a platform that were replaced, so their settings are restored
// when the entity comes back after switching demos
const retiredEntries = new Map<string, EntityRegistryEntry>();

// Replaces the entries of a platform, like core does for the entities of a
// demo config
export const setPlatformEntityRegistryEntries = (
  hass: MockHomeAssistant,
  platform: string,
  platformEntries: Pick<EntityRegistryEntry, "entity_id" | "unique_id">[]
) => {
  for (const entry of entries) {
    if (entry.platform === platform) {
      retiredEntries.set(`${platform}.${entry.unique_id}`, entry);
    }
  }
  const restored: EntityRegistryEntry[] = [];
  const platformRegistryEntries = platformEntries.map((entry) => {
    const retired = retiredEntries.get(`${platform}.${entry.unique_id}`);
    if (!retired) {
      return newEntry({ ...entry, platform });
    }
    const restoredEntry = { ...retired, entity_id: entry.entity_id };
    restored.push(restoredEntry);
    return restoredEntry;
  });
  entries = [
    ...entries.filter((e) => e.platform !== platform),
    ...platformRegistryEntries,
  ];
  // The display registry was rebuilt with the entities, restore its settings
  if (restored.length) {
    const entities = { ...hass.entities };
    for (const entry of restored) {
      if (entities[entry.entity_id]) {
        entities[entry.entity_id] = {
          ...entities[entry.entity_id],
          ...displayFields(entry),
        };
      }
    }
    hass.updateHass({ entities });
  }
  hass.mockEvent("entity_registry_updated");
};

export const getEntityRegistryEntry = (entityId: string) =>
  entries.find((e) => e.entity_id === entityId);

export const removeEntityRegistryEntry = (
  hass: MockHomeAssistant,
  entityId: string
) => {
  entries = entries.filter((e) => e.entity_id !== entityId);
  hass.mockEvent("entity_registry_updated");
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

// The app refetches the display registry on entity_registry_updated events.
// Answer with the current display registry, which the demo keeps in hass.
export const mockEntityRegistryDisplay = (hass: MockHomeAssistant) =>
  hass.mockWS(
    "config/entity_registry/list_for_display",
    (
      _msg,
      currentHass: MockHomeAssistant
    ): EntityRegistryDisplayEntryResponse => {
      const categories = [
        ...new Set(
          Object.values(currentHass.entities)
            .map((entity) => entity.entity_category)
            .filter((category) => category !== undefined)
        ),
      ];
      return {
        entities: Object.values(currentHass.entities).map((entity) => ({
          ei: entity.entity_id,
          di: entity.device_id,
          ai: entity.area_id,
          np: entity.next_name_part,
          lb: entity.labels,
          ec: entity.entity_category
            ? categories.indexOf(entity.entity_category)
            : undefined,
          en: entity.name,
          ic: entity.icon,
          pl: entity.platform ?? "demo",
          tk: entity.translation_key,
          hb: entity.hidden,
          dp: entity.display_precision,
          hn: entity.has_entity_name,
        })),
        entity_categories: Object.fromEntries(
          categories.map((category, index) => [index, category])
        ),
      };
    }
  );
