import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockSystemLog = (hass: MockHomeAssistant) => {
  hass.mockAPI("error/all", () => []);
};
