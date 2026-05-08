import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockUpdate = (hass: MockHomeAssistant) => {
  hass.mockWS("update/list", () => []);
};
