import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockEvents = (hass: MockHomeAssistant) => {
  hass.mockAPI("events", () => []);
};
