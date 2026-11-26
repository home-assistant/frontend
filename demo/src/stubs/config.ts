import type { validateConfig } from "../../../src/data/config";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockConfig = (hass: MockHomeAssistant) => {
  hass.mockWS<typeof validateConfig>("validate_config", () => ({
    actions: { valid: true, error: null, errors: [] },
    conditions: { valid: true, error: null, errors: [] },
    triggers: { valid: true, error: null, errors: [] },
  }));
};
