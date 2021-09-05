import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockConfig = (hass: MockHomeAssistant) => {
  hass.mockAPI("config/config_entries/entry", () => [
    {
      entry_id: "co2signal",
      domain: "co2signal",
      title: "CO2 Signal",
      source: "user",
      state: "loaded",
      supports_options: false,
      supports_unload: true,
      pref_disable_new_entities: false,
      pref_disable_polling: false,
      disabled_by: null,
      reason: null,
    },
  ]);
  hass.mockWS("config/entity_registry/list", () => [
    {
      config_entry_id: "co2signal",
      device_id: "co2signal",
      area_id: null,
      disabled_by: null,
      entity_id: "sensor.co2_intensity",
      name: null,
      icon: null,
      platform: "co2signal",
    },
    {
      config_entry_id: "co2signal",
      device_id: "co2signal",
      area_id: null,
      disabled_by: null,
      entity_id: "sensor.grid_fossil_fuel_percentage",
      name: null,
      icon: null,
      platform: "co2signal",
    },
  ]);
};
