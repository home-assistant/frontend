import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockMediaPlayer = (hass: MockHomeAssistant) => {
  hass.mockWS("media_player_thumbnail", () => Promise.reject());
};
