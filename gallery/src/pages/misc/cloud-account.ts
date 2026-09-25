import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import type { HASSDomEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-formfield";
import "../../../../src/components/ha-select";
import type { HaSelectSelectEvent } from "../../../../src/components/ha-select";
import "../../../../src/components/ha-switch";
import type { HaSwitch } from "../../../../src/components/ha-switch";
import type { BackupConfig } from "../../../../src/data/backup";
import { BackupScheduleRecurrence } from "../../../../src/data/backup";
import type {
  CloudStatusLoggedIn,
  RemoteCertificateStatus,
  SubscriptionInfo,
} from "../../../../src/data/cloud";
import { ONBOARDING_ITEMS } from "../../../../src/data/cloud";
import type { Webhook } from "../../../../src/data/webhook";
import type { ShowDialogParams } from "../../../../src/dialogs/make-dialog-manager";
import { showDialog } from "../../../../src/dialogs/make-dialog-manager";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { ProvideHassElement } from "../../../../src/mixins/provide-hass-lit-mixin";
import "../../../../src/panels/config/cloud/account/cloud-account-onboarding";
import "../../../../src/panels/config/cloud/account/cloud-account-overview";
import { onboardingComplete } from "../../../../src/panels/config/cloud/account/cloud-account-status";
import { showCloudOnboardingDialog } from "../../../../src/panels/config/cloud/account/show-dialog-cloud-onboarding";
import type { HomeAssistant } from "../../../../src/types";

// This demo renders the self-contained cloud account cards (overview +
// onboarding) directly, driven by mocked data, with controls to flip the
// subscription, remote, backup, onboarding, and feature state so every UI state
// can be previewed. It intentionally does NOT render the <cloud-account> panel
// wrapper, which adds a hass-subpage toolbar/back button and route links that
// have no home in the gallery. See src/panels/config/cloud/account.

// The five PaymentSubscriptionState values.
type DemoCloudAccount =
  "active" | "trialing" | "canceled" | "expired" | "unknown";

// "local": automatic backups run, but only to the local agent (no cloud copy).
// "none": no automatic backups at all.
type DemoCloudBackup = "fresh" | "stale" | "failed" | "local" | "none";

interface CloudDemoScenario {
  account: DemoCloudAccount;
  onboarded: boolean;
  postponed: boolean;
  remote: boolean;
  remoteStatus: RemoteCertificateStatus;
  backup: DemoCloudBackup;
  alexa: boolean;
  google: boolean;
  webrtc: boolean;
  webhooks: boolean;
}

const DEFAULT_SCENARIO: CloudDemoScenario = {
  account: "active",
  // Onboarding not completed and streaming (WebRTC) left off, so the onboarding
  // card shows by default with streaming as the remaining step.
  onboarded: false,
  postponed: false,
  remote: true,
  remoteStatus: "ready",
  backup: "fresh",
  alexa: true,
  google: true,
  webrtc: false,
  webhooks: true,
};

const SUBSCRIPTION_OPTIONS: { value: DemoCloudAccount; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "trialing", label: "Trialing" },
  { value: "canceled", label: "Canceled" },
  { value: "expired", label: "Expired" },
  { value: "unknown", label: "Unknown" },
];

const REMOTE_STATUS_OPTIONS: {
  value: RemoteCertificateStatus;
  label: string;
}[] = [
  { value: "ready", label: "Ready" },
  { value: "generating", label: "Preparing" },
  { value: "loading", label: "Loading" },
  { value: "loaded", label: "Loaded" },
  { value: "error", label: "Error" },
];

const BACKUP_OPTIONS: { value: DemoCloudBackup; label: string }[] = [
  { value: "fresh", label: "Recent" },
  { value: "stale", label: "Old" },
  { value: "failed", label: "Failed" },
  { value: "local", label: "Local only" },
  { value: "none", label: "None" },
];

const TOGGLES: [keyof CloudDemoScenario, string][] = [
  ["onboarded", "Onboarded"],
  ["postponed", "Onboarding postponed"],
  ["remote", "Remote access"],
  ["alexa", "Alexa linked"],
  ["google", "Google linked"],
  ["webrtc", "Cameras (WebRTC)"],
  ["webhooks", "Has webhooks"],
];

const CLOUD_AGENT = "cloud.cloud";

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

const buildSubscription = (scenario: CloudDemoScenario): SubscriptionInfo => ({
  human_description: "Demo subscription, renews automatically",
  provider: "Nabu Casa, Inc.",
  plan_renewal_date: 4102444800,
  subscription: { status: scenario.account },
});

const buildCloudStatus = (scenario: CloudDemoScenario): CloudStatusLoggedIn => {
  const active =
    scenario.account !== "canceled" && scenario.account !== "expired";
  const cloudhooks = scenario.webhooks
    ? Object.fromEntries(
        demoWebhooks.map((webhook) => [
          webhook.webhook_id,
          {
            webhook_id: webhook.webhook_id,
            cloudhook_id: `demo-${webhook.webhook_id}`,
            cloudhook_url: `https://hooks.nabu.casa/demo-${webhook.webhook_id}`,
            managed: false,
          },
        ])
      )
    : {};
  return {
    logged_in: true,
    cloud: "connected",
    cloud_last_disconnect_reason: null,
    email: "demo@home-assistant.io",
    google_registered: scenario.google,
    google_entities: emptyFilter(),
    google_domains: ["light", "switch", "climate", "cover"],
    alexa_registered: scenario.alexa,
    alexa_entities: emptyFilter(),
    remote_domain: "demo-instance.ui.nabu.casa",
    remote_connected: scenario.remote,
    remote_certificate: {
      common_name: "demo-instance.ui.nabu.casa",
      expire_date: "2099-01-01T00:00:00+00:00",
      fingerprint: "demodemodemodemodemodemodemodemodemodemodemodemodemo",
      alternative_names: ["demo-instance.ui.nabu.casa"],
    },
    remote_certificate_status: scenario.remoteStatus,
    http_use_ssl: false,
    active_subscription: active,
    onboarding_postponed: scenario.postponed,
    onboarding_completed: scenario.onboarded,
    prefs: {
      google_enabled: scenario.google,
      alexa_enabled: scenario.alexa,
      remote_enabled: scenario.remote,
      remote_allow_remote_enable: true,
      strict_connection: "disabled",
      google_secure_devices_pin: undefined,
      cloudhooks,
      alexa_report_state: true,
      google_report_state: true,
      tts_default_voice: ["en-US", "JennyNeural"],
      cloud_ice_servers_enabled: scenario.webrtc,
      onboarded_items: scenario.onboarded ? [...ONBOARDING_ITEMS] : [],
      onboarding_postponed_until: scenario.postponed
        ? new Date(Date.now() + 24 * 3600 * 1000).toISOString()
        : null,
    },
  };
};

const buildBackupConfig = (scenario: CloudDemoScenario): BackupConfig => {
  const now = Date.now();
  const recent = new Date(now - 12 * 3600 * 1000).toISOString();
  const old = new Date(now - 5 * 86400000).toISOString();
  const future = new Date(now + 86400000).toISOString();
  const overdue = new Date(now - 6 * 3600 * 1000).toISOString();

  const cloudEnabled =
    scenario.backup === "fresh" ||
    scenario.backup === "stale" ||
    scenario.backup === "failed";

  let configured = true;
  let lastCompleted: string | null = null;
  let lastAttempted: string | null = null;
  let next: string | null = null;
  switch (scenario.backup) {
    case "fresh":
    case "local":
      lastCompleted = recent;
      lastAttempted = recent;
      next = future;
      break;
    case "stale":
      lastCompleted = old;
      lastAttempted = old;
      next = overdue;
      break;
    case "failed":
      lastCompleted = old;
      lastAttempted = recent;
      next = future;
      break;
    case "none":
      configured = false;
      break;
  }

  return {
    automatic_backups_configured: configured,
    last_attempted_automatic_backup: lastAttempted,
    last_completed_automatic_backup: lastCompleted,
    next_automatic_backup: next,
    next_automatic_backup_additional: false,
    create_backup: {
      agent_ids: cloudEnabled
        ? ["backup.local", CLOUD_AGENT]
        : ["backup.local"],
      include_addons: [],
      include_all_addons: true,
      include_database: true,
      include_folders: [],
      name: null,
      password: null,
    },
    retention: { copies: 3, days: null },
    schedule: {
      recurrence: BackupScheduleRecurrence.DAILY,
      time: null,
      days: [],
    },
    agents: {
      "backup.local": { protected: true, retention: null },
      "cloud.cloud": { protected: true, retention: null },
    },
  };
};

@customElement("demo-misc-cloud-account")
export class DemoMiscCloudAccount
  extends LitElement
  implements ProvideHassElement
{
  @state() private hass!: HomeAssistant;

  @state() private _scenario: CloudDemoScenario = { ...DEFAULT_SCENARIO };

  @state() private _cloudStatus!: CloudStatusLoggedIn;

  @state() private _subscription!: SubscriptionInfo;

  @state() private _backupConfig!: BackupConfig;

  constructor() {
    super();
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("config", "en");

    hass.updateHass({
      config: {
        ...hass.config,
        components: [
          ...(hass.config?.components ?? []),
          "cloud",
          "backup",
          "webhook",
        ],
      },
    });
    this._registerMocks(hass);
    this._applyScenario();
  }

  public provideHass(el) {
    el.hass = this.hass;
  }

  public connectedCallback() {
    super.connectedCallback();
    this.addEventListener("show-dialog", this._showDialog);
    this.addEventListener("cloud-open-onboarding", this._openOnboarding);
    this.addEventListener("ha-refresh-cloud-status", this._refreshFromMocks);
    // The overview and onboarding dialog contain real <a href="/config/..">
    // links to panel routes that do not exist in the gallery. Keep them inert.
    this.addEventListener("click", this._neutralizeNavigation);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("show-dialog", this._showDialog);
    this.removeEventListener("cloud-open-onboarding", this._openOnboarding);
    this.removeEventListener("ha-refresh-cloud-status", this._refreshFromMocks);
    this.removeEventListener("click", this._neutralizeNavigation);
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }
    const showOnboarding =
      this._cloudStatus.active_subscription &&
      !this._cloudStatus.onboarding_completed &&
      !this._cloudStatus.onboarding_postponed &&
      !onboardingComplete(this._cloudStatus, this._backupConfig);

    return html`
      <div class="options">
        <div class="selects">
          ${this._select("Subscription", "account", SUBSCRIPTION_OPTIONS)}
          ${this._select("Remote status", "remoteStatus", REMOTE_STATUS_OPTIONS)}
          ${this._select("Backups", "backup", BACKUP_OPTIONS)}
        </div>
        <div class="switches">
          ${TOGGLES.map(([field, label]) => this._toggle(label, field))}
        </div>
      </div>
      <div class="preview">
        ${
          showOnboarding
            ? html`
                <cloud-account-onboarding
                  .hass=${this.hass}
                  .cloudStatus=${this._cloudStatus}
                  .backupConfig=${this._backupConfig}
                ></cloud-account-onboarding>
              `
            : nothing
        }
        <cloud-account-overview
          .hass=${this.hass}
          .cloudStatus=${this._cloudStatus}
          .subscription=${this._subscription}
          .backupConfig=${this._backupConfig}
          .webhooks=${demoWebhooks}
        ></cloud-account-overview>
      </div>
    `;
  }

  private _select(
    label: string,
    field: keyof CloudDemoScenario,
    options: { value: string; label: string }[]
  ) {
    return html`
      <ha-select
        .label=${label}
        .value=${String(this._scenario[field])}
        .options=${options}
        data-field=${field}
        @selected=${this._selectChanged}
      ></ha-select>
    `;
  }

  private _toggle(label: string, field: keyof CloudDemoScenario) {
    return html`
      <ha-formfield .label=${label}>
        <ha-switch
          .checked=${this._scenario[field] as boolean}
          data-field=${field}
          @change=${this._switchChanged}
        ></ha-switch>
      </ha-formfield>
    `;
  }

  private _selectChanged(ev: HaSelectSelectEvent) {
    const field = (ev.currentTarget as HTMLElement).dataset
      .field as keyof CloudDemoScenario;
    this._setField(field, ev.detail.value as string);
  }

  private _switchChanged(ev: Event) {
    const target = ev.target as HaSwitch;
    this._setField(
      target.dataset.field as keyof CloudDemoScenario,
      target.checked
    );
  }

  private _setField(field: keyof CloudDemoScenario, value: string | boolean) {
    if (this._scenario[field] === value) {
      return;
    }
    this._scenario = { ...this._scenario, [field]: value };
    this._applyScenario();
  }

  private _applyScenario() {
    this._cloudStatus = buildCloudStatus(this._scenario);
    this._subscription = buildSubscription(this._scenario);
    this._backupConfig = buildBackupConfig(this._scenario);
  }

  private _openOnboarding = () => {
    showCloudOnboardingDialog(this, {
      cloudStatus: this._cloudStatus,
      backupConfig: this._backupConfig,
      onChanged: () => this._refreshFromMocks(),
    });
  };

  private _showDialog = (ev: HASSDomEvent<ShowDialogParams<unknown>>) => {
    const { dialogTag, dialogImport, dialogParams, addHistory, parentElement } =
      ev.detail;
    showDialog(
      this,
      dialogTag,
      dialogParams,
      dialogImport,
      parentElement,
      addHistory
    );
  };

  private _refreshFromMocks = () => {
    this._cloudStatus = {
      ...this._cloudStatus,
      prefs: { ...this._cloudStatus.prefs },
    };
    this._backupConfig = { ...this._backupConfig };
    const cloudBackup =
      this._backupConfig.create_backup.agent_ids.includes(CLOUD_AGENT);
    this._scenario = {
      ...this._scenario,
      onboarded: this._cloudStatus.onboarding_completed,
      postponed: this._cloudStatus.onboarding_postponed,
      remote: this._cloudStatus.prefs.remote_enabled,
      webrtc: this._cloudStatus.prefs.cloud_ice_servers_enabled,
      backup: !this._backupConfig.automatic_backups_configured
        ? "none"
        : cloudBackup
          ? this._scenario.backup === "fresh" ||
            this._scenario.backup === "stale" ||
            this._scenario.backup === "failed"
            ? this._scenario.backup
            : "fresh"
          : "local",
    };
  };

  private _neutralizeNavigation = (ev: MouseEvent) => {
    const anchor = ev
      .composedPath()
      .find((el): el is HTMLAnchorElement => el instanceof HTMLAnchorElement);
    if (anchor?.getAttribute("href")?.startsWith("/")) {
      ev.preventDefault();
    }
  };

  private _registerMocks(hass: MockHomeAssistant) {
    hass.mockWS("cloud/status", () => ({
      ...this._cloudStatus,
      prefs: { ...this._cloudStatus.prefs },
    }));

    hass.mockWS("cloud/update_prefs", (msg) => {
      const { type, ...prefs } = msg;
      this._cloudStatus.prefs = { ...this._cloudStatus.prefs, ...prefs };
      return { success: true };
    });

    hass.mockWS("cloud/onboarding/postpone", () => {
      this._cloudStatus.onboarding_postponed = true;
      this._cloudStatus.prefs.onboarding_postponed_until = new Date(
        Date.now() + 24 * 3600 * 1000
      ).toISOString();
      return { ...this._cloudStatus, prefs: { ...this._cloudStatus.prefs } };
    });

    hass.mockWS("cloud/remote/connect", () => {
      this._cloudStatus.remote_connected = true;
      this._cloudStatus.prefs.remote_enabled = true;
      return null;
    });
    hass.mockWS("cloud/remote/disconnect", () => {
      this._cloudStatus.remote_connected = false;
      this._cloudStatus.prefs.remote_enabled = false;
      return null;
    });

    hass.mockWS("backup/config/info", () => ({
      config: { ...this._backupConfig },
    }));
    hass.mockWS("backup/config/update", (msg) => {
      const { type, ...update } = msg;
      if (update.create_backup) {
        this._backupConfig.create_backup = {
          ...this._backupConfig.create_backup,
          ...update.create_backup,
        };
      }
      if (update.automatic_backups_configured !== undefined) {
        this._backupConfig.automatic_backups_configured =
          update.automatic_backups_configured;
      }
      return null;
    });
  }

  static styles = css`
    .options {
      max-width: 600px;
      margin: 16px auto 0;
      padding: 0 16px 16px;
      border-bottom: 1px solid var(--divider-color);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .selects {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .selects ha-select {
      min-width: 160px;
      flex: 1;
    }
    .switches {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 16px;
    }
    .preview {
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-6, 24px);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-misc-cloud-account": DemoMiscCloudAccount;
  }
}
