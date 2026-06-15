import type {
  CloudStatusLoggedIn,
  SubscriptionInfo,
} from "../../../src/data/cloud";
import type { CloudTTSInfo } from "../../../src/data/cloud/tts";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const emptyFilter = () => ({
  include_domains: [],
  include_entities: [],
  exclude_domains: [],
  exclude_entities: [],
});

// A single mutable status object so that preference changes made in the demo
// are reflected back in the UI.
const cloudStatus: CloudStatusLoggedIn = {
  logged_in: true,
  cloud: "connected",
  cloud_last_disconnect_reason: null,
  email: "demo@home-assistant.io",
  google_registered: true,
  google_entities: emptyFilter(),
  google_domains: ["light", "switch", "climate", "cover"],
  alexa_registered: true,
  alexa_entities: emptyFilter(),
  remote_domain: "demo-instance.ui.nabu.casa",
  remote_connected: true,
  remote_certificate: {
    common_name: "demo-instance.ui.nabu.casa",
    expire_date: "2099-01-01T00:00:00+00:00",
    fingerprint: "demodemodemodemodemodemodemodemodemodemodemodemodemo",
    alternative_names: ["demo-instance.ui.nabu.casa"],
  },
  remote_certificate_status: "ready",
  http_use_ssl: false,
  active_subscription: true,
  prefs: {
    google_enabled: true,
    alexa_enabled: true,
    remote_enabled: true,
    remote_allow_remote_enable: true,
    strict_connection: "disabled",
    google_secure_devices_pin: undefined,
    cloudhooks: {},
    alexa_report_state: true,
    google_report_state: true,
    tts_default_voice: ["en-US", "JennyNeural"],
    cloud_ice_servers_enabled: true,
  },
};

const subscription: SubscriptionInfo = {
  human_description: "Demo subscription, renews automatically",
  provider: "Nabu Casa, Inc.",
  plan_renewal_date: 4102444800,
};

const ttsInfo: CloudTTSInfo = {
  languages: [
    ["en-US", "JennyNeural", "Jenny"],
    ["en-US", "GuyNeural", "Guy"],
    ["en-GB", "LibbyNeural", "Libby"],
    ["nl-NL", "ColetteNeural", "Colette"],
    ["de-DE", "KatjaNeural", "Katja"],
  ],
};

export const mockCloud = (hass: MockHomeAssistant) => {
  hass.mockWS("cloud/status", () => cloudStatus);
  hass.mockWS("cloud/subscription", () => subscription);
  hass.mockWS("cloud/tts/info", () => ttsInfo);

  hass.mockWS("cloud/update_prefs", (msg) => {
    const { type, ...prefs } = msg;
    cloudStatus.prefs = { ...cloudStatus.prefs, ...prefs };
    return { success: true };
  });

  hass.mockWS("cloud/cloudhook/create", (msg) => {
    const webhook = {
      webhook_id: msg.webhook_id,
      cloudhook_id: "demo-cloudhook-id",
      cloudhook_url: `https://hooks.nabu.casa/demo-${msg.webhook_id}`,
      managed: false,
    };
    cloudStatus.prefs.cloudhooks = {
      ...cloudStatus.prefs.cloudhooks,
      [msg.webhook_id]: webhook,
    };
    return webhook;
  });

  hass.mockWS("cloud/cloudhook/delete", (msg) => {
    const cloudhooks = { ...cloudStatus.prefs.cloudhooks };
    delete cloudhooks[msg.webhook_id];
    cloudStatus.prefs.cloudhooks = cloudhooks;
    return null;
  });

  hass.mockWS("cloud/remote/connect", () => {
    cloudStatus.remote_connected = true;
    return null;
  });
  hass.mockWS("cloud/remote/disconnect", () => {
    cloudStatus.remote_connected = false;
    return null;
  });

  hass.mockWS("cloud/remove_data", () => null);
  hass.mockWS("cloud/google_assistant/entities/update", () => null);

  hass.mockAPI("cloud/logout", () => ({}));
  hass.mockAPI("cloud/google_actions/sync", () => ({}));
  hass.mockAPI("cloud/support_package", () => "Demo support package");
};
