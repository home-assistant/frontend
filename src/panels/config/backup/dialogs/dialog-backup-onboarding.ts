import { mdiClose, mdiContentCopy, mdiDownload } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { fireEvent } from "../../../../common/dom/fire_event";
import { copyToClipboard } from "../../../../common/util/copy-clipboard";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-button-prev";
import "../../../../components/ha-icon-next";
import "../../../../components/ha-md-dialog";
import type { HaMdDialog } from "../../../../components/ha-md-dialog";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-password-field";
import "../../../../components/ha-svg-icon";
import type {
  BackupConfig,
  BackupMutableConfig,
} from "../../../../data/backup";
import {
  BackupScheduleRecurrence,
  CLOUD_AGENT,
  CORE_LOCAL_AGENT,
  downloadEmergencyKit,
  generateEncryptionKey,
  HASSIO_LOCAL_AGENT,
  updateBackupConfig,
} from "../../../../data/backup";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import "../components/config/ha-backup-config-agents";
import "../components/config/ha-backup-config-data";
import type { BackupConfigData } from "../components/config/ha-backup-config-data";
import "../components/config/ha-backup-config-schedule";
import type { BackupConfigSchedule } from "../components/config/ha-backup-config-schedule";
import type { BackupOnboardingDialogParams } from "./show-dialog-backup_onboarding";

const STEPS = [
  "welcome",
  "key",
  "setup",
  "schedule",
  "data",
  "locations",
] as const;

type Step = (typeof STEPS)[number];

const FULL_DIALOG_STEPS = new Set<Step>(["setup"]);

const SAVE_STEPS = new Set<Step>(["schedule", "data", "locations"]);

const RECOMMENDED_CONFIG: BackupConfig = {
  automatic_backups_configured: false,
  create_backup: {
    agent_ids: [],
    include_folders: [],
    include_database: true,
    include_addons: [],
    include_all_addons: true,
    password: null,
    name: null,
  },
  retention: {
    copies: 3,
    days: null,
  },
  schedule: {
    recurrence: BackupScheduleRecurrence.DAILY,
    time: null,
    days: [],
  },
  agents: {},
  last_attempted_automatic_backup: null,
  last_completed_automatic_backup: null,
  next_automatic_backup: null,
  next_automatic_backup_additional: false,
};

@customElement("ha-dialog-backup-onboarding")
class DialogBackupOnboarding extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _step?: Step;

  @state() private _params?: BackupOnboardingDialogParams;

  @query("ha-md-dialog") private _dialog!: HaMdDialog;

  @state() private _config?: BackupConfig;

  public showDialog(params: BackupOnboardingDialogParams): void {
    this._params = params;

    if (this._params.config?.create_backup.password) {
      // onboarding wizard was started before, but not finished.
      this._config = this._params.config;
      this._step = "setup";
    } else {
      this._step = this._firstStep;
      this._config = {
        ...RECOMMENDED_CONFIG,
        create_backup: {
          ...RECOMMENDED_CONFIG.create_backup,
          agent_ids: this._defaultAgents,
          password: generateEncryptionKey(),
        },
      };
    }

    this._opened = true;
  }

  public closeDialog() {
    if (this._params!.cancel) {
      this._params!.cancel();
    }
    if (this._opened) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._opened = false;
    this._step = undefined;
    this._config = undefined;
    this._params = undefined;
    return true;
  }

  private get _firstStep(): Step {
    return this._params?.skipWelcome ? STEPS[1] : STEPS[0];
  }

  private async _save(done = false) {
    if (!this._config) {
      return;
    }

    const params: BackupMutableConfig = {
      create_backup: {
        password: this._config.create_backup.password,
        include_database: this._config.create_backup.include_database,
        agent_ids: this._config.create_backup.agent_ids,
      },
      schedule: this._config.schedule,
      retention: this._config.retention,
      automatic_backups_configured: done,
    };

    if (isComponentLoaded(this.hass, "hassio")) {
      params.create_backup!.include_folders =
        this._config.create_backup.include_folders || [];
      params.create_backup!.include_all_addons =
        this._config.create_backup.include_all_addons;
      params.create_backup!.include_addons =
        this._config.create_backup.include_addons || [];
    }

    await updateBackupConfig(this.hass, params);
  }

  private async _done() {
    try {
      await this._save(true);
      this._params?.submit!(true);
      this._dialog.close();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      showToast(this, { message: "Failed to save backup configuration" });
    }
  }

  private _previousStep() {
    const index = STEPS.indexOf(this._step!);
    if (index === 0) {
      return;
    }
    this._step = STEPS[index - 1];
  }

  private _nextStep() {
    if (this._step && SAVE_STEPS.has(this._step)) {
      this._save();
    }
    const index = STEPS.indexOf(this._step!);
    if (index === STEPS.length - 1) {
      return;
    }
    this._step = STEPS[index + 1];
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("_step") && this._step === "key") {
      this._save();
    }
  }

  protected render() {
    if (!this._opened || !this._params || !this._step) {
      return nothing;
    }

    const isLastStep = this._step === STEPS[STEPS.length - 1];
    const isFirstStep = this._step === this._firstStep;

    return html`
      <ha-md-dialog disable-cancel-action open @closed=${this.closeDialog}>
        <ha-dialog-header slot="headline">
          ${isFirstStep
            ? html`
                <ha-icon-button
                  slot="navigationIcon"
                  .label=${this.hass.localize("ui.common.close")}
                  .path=${mdiClose}
                  @click=${this.closeDialog}
                ></ha-icon-button>
              `
            : html`
                <ha-icon-button-prev
                  slot="navigationIcon"
                  @click=${this._previousStep}
                ></ha-icon-button-prev>
              `}

          <span slot="title">${this._stepTitle}</span>
        </ha-dialog-header>
        <div slot="content">${this._renderStepContent()}</div>
        ${!FULL_DIALOG_STEPS.has(this._step)
          ? html`
              <div slot="actions">
                ${isLastStep
                  ? html`
                      <ha-button
                        @click=${this._done}
                        .disabled=${!this._isStepValid()}
                      >
                        ${this.hass.localize(
                          "ui.panel.config.backup.dialogs.onboarding.save_and_create"
                        )}
                      </ha-button>
                    `
                  : html`
                      <ha-button
                        @click=${this._nextStep}
                        .disabled=${!this._isStepValid()}
                      >
                        ${this.hass.localize("ui.common.next")}
                      </ha-button>
                    `}
              </div>
            `
          : nothing}
      </ha-md-dialog>
    `;
  }

  private get _defaultAgents(): string[] {
    const agents: string[] = [];
    // Enable local location by default
    if (isComponentLoaded(this.hass, "hassio")) {
      agents.push(HASSIO_LOCAL_AGENT);
    } else {
      agents.push(CORE_LOCAL_AGENT);
    }
    // Enable cloud location if logged in
    if (this._params?.cloudStatus?.logged_in) {
      agents.push(CLOUD_AGENT);
    }
    return agents;
  }

  private _useRecommended() {
    if (!this._config?.create_backup.password) {
      // this should not happen, if there is no password set, restart the wizard
      this.showDialog(this._params!);
      return;
    }
    this._config = {
      ...RECOMMENDED_CONFIG,
      create_backup: {
        ...RECOMMENDED_CONFIG.create_backup,
        agent_ids: this._defaultAgents,
        password: this._config.create_backup.password,
      },
    };
    this._done();
  }

  private get _stepTitle(): string {
    switch (this._step) {
      case "key":
      case "setup":
      case "schedule":
      case "data":
      case "locations":
        return this.hass.localize(
          `ui.panel.config.backup.dialogs.onboarding.${this._step}.title`
        );
      default:
        return "";
    }
  }

  private _isStepValid(): boolean {
    switch (this._step) {
      case "key":
        return true;
      case "setup":
        return true;
      case "schedule":
        return !!this._config?.schedule;
      case "data":
        return !!this._config?.schedule;
      case "locations":
        return !!this._config?.create_backup.agent_ids.length;
      default:
        return true;
    }
  }

  private _renderStepContent() {
    if (!this._config) {
      return nothing;
    }

    switch (this._step) {
      case "welcome":
        return html`
          <div class="welcome">
            <img
              src="/static/images/voice-assistant/hi.png"
              alt="Casita Home Assistant logo"
            />
            <h1>
              ${this.hass.localize(
                "ui.panel.config.backup.dialogs.onboarding.welcome.title"
              )}
            </h1>
            <p class="secondary">
              ${this.hass.localize(
                "ui.panel.config.backup.dialogs.onboarding.welcome.description"
              )}
            </p>
          </div>
        `;
      case "key":
        return html`
          <p>
            ${this.hass.localize(
              "ui.panel.config.backup.dialogs.onboarding.key.description"
            )}
          </p>
          <div class="encryption-key">
            <p>${this._config.create_backup.password}</p>
            <ha-icon-button
              .path=${mdiContentCopy}
              @click=${this._copyKeyToClipboard}
            ></ha-icon-button>
          </div>
          <ha-md-list>
            <ha-md-list-item>
              <span slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.backup.encryption_key.download_emergency_kit"
                )}
              </span>
              <span slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.backup.encryption_key.download_emergency_kit_description"
                )}
              </span>
              <ha-button
                size="small"
                appearance="plain"
                slot="end"
                @click=${this._downloadKey}
              >
                <ha-svg-icon .path=${mdiDownload} slot="start"></ha-svg-icon>
                ${this.hass.localize(
                  "ui.panel.config.backup.encryption_key.download_emergency_kit_action"
                )}
              </ha-button>
            </ha-md-list-item>
          </ha-md-list>
        `;
      case "setup":
        return html`
          <ha-md-list class="full">
            <ha-md-list-item type="button" @click=${this._useRecommended}>
              <span slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.backup.dialogs.onboarding.setup.recommended_heading"
                )}
              </span>
              <span slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.backup.dialogs.onboarding.setup.recommended_description"
                )}
              </span>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            <ha-md-list-item type="button" @click=${this._nextStep}>
              <span slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.backup.dialogs.onboarding.setup.custom_heading"
                )}
              </span>
              <span slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.backup.dialogs.onboarding.setup.custom_description"
                )}
              </span>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
          </ha-md-list>
        `;
      case "schedule":
        return html`
          <p>
            ${this.hass.localize(
              "ui.panel.config.backup.dialogs.onboarding.schedule.description"
            )}
          </p>
          <ha-backup-config-schedule
            .hass=${this.hass}
            .value=${this._config}
            @value-changed=${this._scheduleChanged}
          ></ha-backup-config-schedule>
        `;
      case "data":
        return html`
          <p>
            ${this.hass.localize(
              "ui.panel.config.backup.dialogs.onboarding.data.description"
            )}
          </p>
          <ha-backup-config-data
            .hass=${this.hass}
            .value=${this._dataConfig(this._config)}
            @value-changed=${this._dataChanged}
            force-home-assistant
            hide-addon-version
          ></ha-backup-config-data>
        `;
      case "locations":
        return html`
          <p>
            ${this.hass.localize(
              "ui.panel.config.backup.dialogs.onboarding.locations.description"
            )}
          </p>
          <ha-backup-config-agents
            .hass=${this.hass}
            .value=${this._config.create_backup.agent_ids}
            .cloudStatus=${this._params!.cloudStatus}
            @value-changed=${this._agentsConfigChanged}
          ></ha-backup-config-agents>
        `;
    }
    return nothing;
  }

  private _downloadKey() {
    const key = this._config?.create_backup.password;
    if (!key) {
      return;
    }
    downloadEmergencyKit(this.hass, key);
  }

  private async _copyKeyToClipboard() {
    await copyToClipboard(
      this._config!.create_backup.password!,
      this.renderRoot.querySelector("div")!
    );
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  private _dataConfig(config: BackupConfig): BackupConfigData {
    const {
      include_addons,
      include_all_addons,
      include_database,
      include_folders,
    } = config.create_backup;

    return {
      include_homeassistant: true,
      include_database,
      include_folders: include_folders || undefined,
      include_all_addons,
      include_addons: include_addons || undefined,
    };
  }

  private _dataChanged(ev) {
    const data = ev.detail.value as BackupConfigData;
    this._config = {
      ...this._config!,
      create_backup: {
        ...this._config!.create_backup,
        include_database: data.include_database,
        include_folders: data.include_folders || null,
        include_all_addons: data.include_all_addons,
        include_addons: data.include_addons || null,
      },
    };
  }

  private _scheduleChanged(ev) {
    const value = ev.detail.value as BackupConfigSchedule;
    this._config = {
      ...this._config!,
      schedule: value.schedule,
      retention: value.retention,
    };
  }

  private _agentsConfigChanged(ev) {
    const agents = ev.detail.value as string[];
    this._config = {
      ...this._config!,
      create_backup: {
        ...this._config!.create_backup,
        agent_ids: agents,
      },
    };
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-md-dialog {
          width: 90vw;
          max-width: 560px;
          --dialog-content-padding: 8px 24px;
          max-height: min(605px, 100% - 48px);
        }
        ha-md-list {
          background: none;
          --md-list-item-leading-space: 0;
          --md-list-item-trailing-space: 0;
        }
        ha-md-list.full {
          --md-list-item-leading-space: 24px;
          --md-list-item-trailing-space: 24px;
          margin-left: -24px;
          margin-right: -24px;
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-md-dialog {
            max-width: none;
          }
          div[slot="content"] {
            margin-top: 0;
          }
        }
        p {
          margin-top: 0;
        }
        .welcome {
          text-align: center;
        }
        .encryption-key {
          border: 1px solid var(--divider-color);
          background-color: var(--primary-background-color);
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 24px;
        }
        .encryption-key p {
          margin: 0;
          flex: 1;
          font-size: var(--ha-font-size-xl);
          font-family: var(--ha-font-family-code);
          font-style: normal;
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          text-align: center;
        }
        .encryption-key ha-icon-button {
          flex: none;
          margin: -16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-backup-onboarding": DialogBackupOnboarding;
  }
}
