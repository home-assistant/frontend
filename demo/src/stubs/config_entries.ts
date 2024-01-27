import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockConfigEntries = (hass: MockHomeAssistant) => {
  hass.mockWS("config_entries/get", () => ({
    entry_id: "co2signal",
    domain: "co2signal",
    title: "Electricity Maps",
    source: "user",
    state: "loaded",
    supports_options: false,
    supports_remove_device: false,
    supports_unload: true,
    pref_disable_new_entities: false,
    pref_disable_polling: false,
    disabled_by: null,
    reason: null,
  }));
};
