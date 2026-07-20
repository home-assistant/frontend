import type { EntitySources } from "../../../src/data/entity/entity_sources";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockEntitySources = (hass: MockHomeAssistant) => {
  hass.mockWS("entity/source", (): EntitySources => ({
    "sensor.co2_intensity": { domain: "co2signal" },
    "sensor.grid_fossil_fuel_percentage": { domain: "co2signal" },
  }));
};
