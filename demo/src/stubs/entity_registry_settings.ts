import type {
  EntityRegistrySettings,
  fetchEntityRegistrySettings,
  updateEntityRegistrySettings,
} from "../../../src/data/entity/entity_registry_settings";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockEntityRegistrySettings = (hass: MockHomeAssistant) => {
  let settings: EntityRegistrySettings = { entity_id_parts: null };

  hass.mockWS<typeof fetchEntityRegistrySettings>(
    "config/entity_registry/settings/get",
    () => settings
  );
  hass.mockWS<typeof updateEntityRegistrySettings>(
    "config/entity_registry/settings/update",
    (msg: Partial<EntityRegistrySettings>) => {
      settings = { ...settings, ...msg };
      return settings;
    }
  );
};
