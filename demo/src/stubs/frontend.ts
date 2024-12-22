import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockFrontend = (hass: MockHomeAssistant) => {
  hass.mockWS("frontend/get_user_data", () => ({
    value: null,
  }));
};
