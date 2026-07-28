import type {
  EntityRegistryEntry,
  ExtEntityRegistryEntry,
} from "../../../src/data/entity/entity_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockEntityRegistry = (
  hass: MockHomeAssistant,
  data: EntityRegistryEntry[] = []
) => {
  hass.mockWS("config/entity_registry/list", () => data);
  hass.mockWS(
    "config/entity_registry/get_entries",
    (msg: { entity_ids: string[] }) => {
      const result: Record<string, ExtEntityRegistryEntry> = {};
      for (const entityId of msg.entity_ids) {
        const entry = data.find((e) => e.entity_id === entityId);
        if (entry) {
          result[entityId] = {
            ...entry,
            capabilities: {},
            original_icon: null,
            device_class: null,
            original_device_class: null,
            aliases: [],
          };
        }
      }
      return result;
    }
  );
};
