import type { NetworkUrls } from "../../../src/data/network";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockNetwork = (hass: MockHomeAssistant) => {
  hass.mockWS(
    "network/url",
    (): NetworkUrls => ({
      internal: "http://homeassistant.local:8123",
      external: "https://demo-instance.ui.nabu.casa",
      cloud: "https://demo-instance.ui.nabu.casa",
    })
  );
};
