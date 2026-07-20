import type {
  CloudStatusLoggedIn,
  SubscriptionInfo,
} from "../../../src/data/cloud";
import { ONBOARDING_ITEMS } from "../../../src/data/cloud";
import type { CloudTTSInfo } from "../../../src/data/cloud/tts";
import type { Webhook } from "../../../src/data/webhook";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import {
  getCloudDemoScenario,
  setCloudDemoScenario,
  subscribeCloudDemoScenario,
} from "./cloud-demo-state";

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

// A single mutable status object so that preference changes made in the demo
// (both via the real UI and the demo scenario controls) are reflected back.
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
  onboarding_postponed: false,
  onboarding_completed: true,
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
    onboarded_items: [...ONBOARDING_ITEMS],
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

// Map the high-level demo scenario onto the mutable cloud status / subscription.
const applyScenario = () => {
  const scenario = getCloudDemoScenario();

  switch (scenario.account) {
    case "trialing":
      cloudStatus.active_subscription = true;
      subscription.subscription = { status: "trialing" };
      break;
    case "canceled":
      cloudStatus.active_subscription = false;
      subscription.subscription = { status: "canceled" };
      break;
    case "expired":
      cloudStatus.active_subscription = false;
      subscription.subscription = { status: "expired" };
      break;
    case "unknown":
      cloudStatus.active_subscription = true;
      subscription.subscription = { status: "unknown" };
      break;
    default:
      // "active"
      cloudStatus.active_subscription = true;
      subscription.subscription = { status: "active" };
  }

  cloudStatus.prefs.onboarded_items = scenario.onboarded
    ? [...ONBOARDING_ITEMS]
    : [];
  cloudStatus.onboarding_completed = scenario.onboarded;
  cloudStatus.onboarding_postponed = scenario.postponed;
  cloudStatus.prefs.onboarding_postponed_until = scenario.postponed
    ? new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    : null;
  cloudStatus.prefs.remote_enabled = scenario.remote;
  cloudStatus.remote_connected = scenario.remote;
  cloudStatus.remote_certificate_status = scenario.remoteStatus;
  cloudStatus.alexa_registered = scenario.alexa;
  cloudStatus.google_registered = scenario.google;
  cloudStatus.prefs.cloud_ice_servers_enabled = scenario.webrtc;

  const hasCloudhooks = Object.keys(cloudStatus.prefs.cloudhooks).length > 0;
  if (scenario.webhooks && !hasCloudhooks) {
    cloudStatus.prefs.cloudhooks = Object.fromEntries(
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
  } else if (!scenario.webhooks && hasCloudhooks) {
    cloudStatus.prefs.cloudhooks = {};
  }
};

applyScenario();
subscribeCloudDemoScenario(applyScenario);

// Reflect UI-driven changes (onboarding toggles, remote connect/disconnect)
// back into the demo scenario so the demo controls panel stays in sync with the
// mocked state. Only writes when a value actually changed, to avoid needless
// re-projection. `applyScenario` re-applies the (now matching) scenario, so
// this stays idempotent and does not fight the direct mutation above.
const syncScenarioFromStatus = () => {
  const scenario = getCloudDemoScenario();
  const next = {
    onboarded: cloudStatus.onboarding_completed,
    postponed: cloudStatus.onboarding_postponed,
    remote: cloudStatus.prefs.remote_enabled,
    webrtc: cloudStatus.prefs.cloud_ice_servers_enabled,
    webhooks: Object.keys(cloudStatus.prefs.cloudhooks).length > 0,
  };
  if (
    scenario.onboarded !== next.onboarded ||
    scenario.postponed !== next.postponed ||
    scenario.remote !== next.remote ||
    scenario.webrtc !== next.webrtc ||
    scenario.webhooks !== next.webhooks
  ) {
    setCloudDemoScenario(next);
  }
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
    syncScenarioFromStatus();
    return { success: true };
  });

  hass.mockWS("cloud/onboarding/postpone", () => {
    cloudStatus.prefs.onboarding_postponed_until = new Date(
      Date.now() + 24 * 3600 * 1000
    ).toISOString();
    cloudStatus.onboarding_postponed = true;
    syncScenarioFromStatus();
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
    syncScenarioFromStatus();
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
    syncScenarioFromStatus();
    return null;
  });

  hass.mockWS("cloud/remote/connect", () => {
    cloudStatus.remote_connected = true;
    cloudStatus.prefs.remote_enabled = true;
    syncScenarioFromStatus();
    return null;
  });
  hass.mockWS("cloud/remote/disconnect", () => {
    cloudStatus.remote_connected = false;
    cloudStatus.prefs.remote_enabled = false;
    syncScenarioFromStatus();
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
