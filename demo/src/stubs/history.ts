import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockHistory = (hass: MockHomeAssistant) => {
  hass.mockAPI(new RegExp("history/period/.+"), () => []);
};
