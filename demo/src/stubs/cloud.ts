import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockCloud = (hass: MockHomeAssistant) => {
  // REST mock for cloud status — returns disconnected so config panel loads
  // without errors but without requiring cloud integration.
  hass.mockAPI("cloud/status", () => ({
    logged_in: false,
    cloud: "disconnected",
    prefs: {
      google_enabled: false,
      alexa_enabled: false,
      cloudhooks: {},
      remote_enabled: false,
    },
    google_registered: false,
    alexa_registered: false,
    remote_domain: null,
    remote_connected: false,
    remote_certificate: null,
  }));
};
