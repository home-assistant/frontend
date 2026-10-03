import type { ApplicationCredential } from "../../../src/data/application_credential";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const credentials: ApplicationCredential[] = [
  {
    id: "mock-credential",
    domain: "spotify",
    client_id: "demo-client-id",
    client_secret: "demo-client-secret",
    name: "Spotify",
  },
];

export const mockApplicationCredentials = (hass: MockHomeAssistant) => {
  hass.mockWS("application_credentials/list", () => credentials);
  hass.mockWS("application_credentials/config", () => ({
    integrations: { spotify: { description_placeholders: {} } },
  }));
};
