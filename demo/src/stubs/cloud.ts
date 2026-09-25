import type {
  CloudStatusLoggedIn,
  SubscriptionInfo,
} from "../../../src/data/cloud";
import { ONBOARDING_ITEMS } from "../../../src/data/cloud";
import type { CloudTTSInfo } from "../../../src/data/cloud/tts";
import type { Webhook } from "../../../src/data/webhook";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const emptyFilter = () => ({
  include_domains: [],
  include_entities: [],
  exclude_domains: [],
  exclude_entities: [],
});

const demoWebhooks: Webhook[] = [
  {
    webhook_id: "demo_front_door",
    domain: "automation",
    name: "Front door motion",
    local_only: false,
  },
  {
    webhook_id: "demo_companion_app",
    domain: "mobile_app",
    name: "Companion app",
    local_only: false,
  },
];

const demoCloudhooks = Object.fromEntries(
  demoWebhooks.map((webhook) => [
    webhook.webhook_id,
    {
      webhook_id: webhook.webhook_id,
      cloudhook_id: `demo-${webhook.webhook_id}`,
      cloudhook_url: `https://hooks.nabu.casa/demo-${webhook.webhook_id}`,
      managed: false,
    },
  ])
);

// A single mutable status object seeded to one fixed demo state: an active cloud
// subscription with remote ready, cloud backups recent, webhooks set up and voice
// set up (Alexa linked), but cameras (WebRTC) off, so onboarding is still in
// progress (streaming is the remaining step) and not postponed. Page-driven
// changes (connect remote, postpone onboarding, add/delete webhooks) mutate this
// object directly and reset on reload.
const cloudStatus: CloudStatusLoggedIn = {
  logged_in: true,
  cloud: "connected",
  cloud_last_disconnect_reason: null,
  email: "demo@home-assistant.io",
  google_registered: false,
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
  onboarding_postponed: false,
  onboarding_completed: false,
  prefs: {
    google_enabled: false,
    alexa_enabled: true,
    remote_enabled: true,
    remote_allow_remote_enable: true,
    strict_connection: "disabled",
    google_secure_devices_pin: undefined,
    cloudhooks: demoCloudhooks,
    alexa_report_state: true,
    google_report_state: true,
    tts_default_voice: ["en-US", "JennyNeural"],
    cloud_ice_servers_enabled: false,
    onboarded_items: [],
    onboarding_postponed_until: null,
  },
};

const subscription: SubscriptionInfo = {
  human_description: "Demo subscription, renews automatically",
  provider: "Nabu Casa, Inc.",
  plan_renewal_date: 4102444800,
  subscription: { status: "active" },
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
  hass.mockWS("cloud/status", () => ({
    ...cloudStatus,
    prefs: { ...cloudStatus.prefs },
  }));
  hass.mockWS("cloud/subscription", () => subscription);
  hass.mockWS("cloud/tts/info", () => ttsInfo);
  hass.mockWS("webhook/list", () => demoWebhooks);

  hass.mockWS("cloud/update_prefs", (msg) => {
    const { type, ...prefs } = msg;
    cloudStatus.prefs = { ...cloudStatus.prefs, ...prefs };
    return { success: true };
  });

  hass.mockWS("cloud/onboarding/postpone", () => {
    cloudStatus.prefs.onboarding_postponed_until = new Date(
      Date.now() + 24 * 3600 * 1000
    ).toISOString();
    cloudStatus.onboarding_postponed = true;
    // Backend returns the full logged-in status object.
    return { ...cloudStatus, prefs: { ...cloudStatus.prefs } };
  });

  hass.mockWS("cloud/onboarding/complete", (msg) => {
    const items: string[] = msg.items ?? [];
    const missing = items.filter(
      (item) => !cloudStatus.prefs.onboarded_items.includes(item)
    );
    if (missing.length) {
      cloudStatus.prefs.onboarded_items = [
        ...cloudStatus.prefs.onboarded_items,
        ...missing,
      ];
    }
    cloudStatus.onboarding_completed = ONBOARDING_ITEMS.every(
      (onboardingItem) =>
        cloudStatus.prefs.onboarded_items.includes(onboardingItem)
    );
    // Backend returns the full logged-in status object.
    return { ...cloudStatus, prefs: { ...cloudStatus.prefs } };
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
    cloudStatus.prefs.remote_enabled = true;
    return null;
  });
  hass.mockWS("cloud/remote/disconnect", () => {
    cloudStatus.remote_connected = false;
    cloudStatus.prefs.remote_enabled = false;
    return null;
  });

  hass.mockWS("cloud/remove_data", () => null);
  hass.mockWS("cloud/google_assistant/entities/update", () => null);
  hass.mockWS("cloud/alexa/entities", () => []);
  hass.mockWS("cloud/google_assistant/entities", () => []);

  hass.mockAPI("cloud/logout", () => ({}));
  hass.mockAPI("cloud/google_actions/sync", () => ({}));
  hass.mockAPI("cloud/support_package", () => "Demo support package");
};
