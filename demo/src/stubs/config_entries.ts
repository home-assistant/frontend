import type { getConfigEntries } from "../../../src/data/config_entries";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockConfigEntries = (hass: MockHomeAssistant) => {
  hass.mockWS<typeof getConfigEntries>("config_entries/get", () => [
    {
      entry_id: "mock-entry-co2signal",
      domain: "co2signal",
      title: "Electricity Maps",
      source: "user",
      state: "loaded",
      supports_options: false,
      supports_remove_device: false,
      supports_unload: true,
      supports_reconfigure: true,
      supported_subentry_types: {},
      pref_disable_new_entities: false,
      pref_disable_polling: false,
      disabled_by: null,
      reason: null,
      num_subentries: 0,
      error_reason_translation_key: null,
      error_reason_translation_placeholders: null,
    },
  ]);
};
