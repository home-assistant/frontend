import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockConfig = (hass: MockHomeAssistant) => {
  hass.mockWS("validate_config", () => ({
    actions: { valid: true },
    conditions: { valid: true },
    triggers: { valid: true },
  }));
};
