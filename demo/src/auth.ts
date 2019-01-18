import { MockHomeAssistant } from "../../src/fake_data/provide_hass";

export const mockAuth = (hass: MockHomeAssistant) => {
  hass.mockWS("config/auth/list", () => []);
};
