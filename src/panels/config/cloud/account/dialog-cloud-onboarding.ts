import {
  mdiBackupRestore,
  mdiCheck,
  mdiCheckCircle,
  mdiEarth,
  mdiGoogleAssistant,
  mdiMicrophone,
  mdiMicrophoneMessage,
  mdiVideo,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { TemplateResult } from "lit";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { fireEvent } from "../../../../common/dom/fire_event";
import { navigate } from "../../../../common/navigate";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-logo-svg";
import "../../../../components/ha-svg-icon";
import type { BackupConfig } from "../../../../data/backup";
import {
  CLOUD_AGENT,
  cloudBackupEnabled,
  fetchBackupConfig,
  updateBackupConfig,
} from "../../../../data/backup";
import type { CloudOnboardingItem } from "../../../../data/cloud";
import {
  connectCloudRemote,
  disconnectCloudRemote,
  fetchCloudStatus,
  ONBOARDING_ITEMS,
  updateCloudPref,
} from "../../../../data/cloud";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import { onboardingPanelCompleted } from "./cloud-account-status";
import type { CloudOnboardingDialogParams } from "./show-dialog-cloud-onboarding";

@customElement("dialog-cloud-onboarding")
export class DialogCloudOnboarding extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: CloudOnboardingDialogParams;

  @state() private _open = false;

  @state() private _openPanel?: string;

  // Kept in sync locally (re-fetched after each toggle) so the panel labels and
  // completion ticks stay live while the dialog is open, independent of the
  // page behind it.
  @state() private _cloudStatus?: CloudOnboardingDialogParams["cloudStatus"];

  @state() private _backupConfig?: BackupConfig;

  public showDialog(params: CloudOnboardingDialogParams): void {
    this._params = params;
    this._cloudStatus = params.cloudStatus;
    this._backupConfig = params.backupConfig;
    this._openPanel = this._firstIncompletePanel();
    this._open = true;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed() {
    this._open = false;
    this._params = undefined;
    this._cloudStatus = undefined;
    this._backupConfig = undefined;
    this._openPanel = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._cloudStatus) {
      return nothing;
    }
    const cloudStatus = this._cloudStatus;
    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.cloud.account.onboarding.dialog_title"
        )}
        @closed=${this._dialogClosed}
      >
        <p class="muted setup-intro">
          ${this.hass.localize(
            "ui.panel.config.cloud.account.onboarding.dialog_intro"
          )}
        </p>
        <div class="setup-dialog">
          <ha-expansion-panel
            outlined
            data-panel="remote"
            .expanded=${this._openPanel === "remote"}
            @expanded-changed=${this._panelExpanded}
          >
            ${this._panelHeader(
              "remote",
              mdiEarth,
              this.hass.localize(
                "ui.panel.config.cloud.account.onboarding.remote_title"
              ),
              this.hass.localize(
                "ui.panel.config.cloud.account.onboarding.remote_helper"
              )
            )}
            <div class="panel-body">
              <p class="muted">
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.onboarding.remote_body"
                )}
              </p>
              <ha-button appearance="plain" @click=${this._toggleRemote}>
                ${cloudStatus.prefs.remote_enabled
                  ? this.hass.localize(
                      "ui.panel.config.cloud.account.onboarding.turn_off"
                    )
                  : this.hass.localize(
                      "ui.panel.config.cloud.account.onboarding.turn_on"
                    )}
              </ha-button>
            </div>
          </ha-expansion-panel>

          <ha-expansion-panel
            outlined
            data-panel="backup"
            .expanded=${this._openPanel === "backup"}
            @expanded-changed=${this._panelExpanded}
          >
            ${this._panelHeader(
              "backup",
              mdiBackupRestore,
              this.hass.localize(
                "ui.panel.config.cloud.account.onboarding.backup_title"
              ),
              this.hass.localize(
                "ui.panel.config.cloud.account.onboarding.backup_helper"
              )
            )}
            <div class="panel-body">
              ${!this._backupConfig?.automatic_backups_configured
                ? html`
                    <p class="muted">
                      ${this.hass.localize(
                        "ui.panel.config.cloud.account.onboarding.backup_none_body"
                      )}
                    </p>
                    <ha-button
                      appearance="plain"
                      href="/config/backup?historyBack=1"
                      @click=${this.closeDialog}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.cloud.account.onboarding.backup_set_up"
                      )}
                    </ha-button>
                  `
                : html`
                    <p class="muted">
                      ${this.hass.localize(
                        "ui.panel.config.cloud.account.onboarding.backup_body"
                      )}
                    </p>
                    <ha-button
                      appearance="plain"
                      @click=${this._toggleCloudBackup}
                    >
                      ${this._cloudBackupEnabled
                        ? this.hass.localize(
                            "ui.panel.config.cloud.account.onboarding.turn_off"
                          )
                        : this.hass.localize(
                            "ui.panel.config.cloud.account.onboarding.turn_on"
                          )}
                    </ha-button>
                  `}
            </div>
          </ha-expansion-panel>

          <ha-expansion-panel
            outlined
            data-panel="voice"
            .expanded=${this._openPanel === "voice"}
            @expanded-changed=${this._panelExpanded}
          >
            ${this._panelHeader(
              "voice",
              mdiMicrophoneMessage,
              this.hass.localize(
                "ui.panel.config.cloud.account.onboarding.voice_title"
              ),
              this.hass.localize(
                "ui.panel.config.cloud.account.onboarding.voice_helper"
              )
            )}
            <div class="panel-body">
              <p class="muted">
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.onboarding.voice_body"
                )}
              </p>
              ${this._voiceCloudCard()}
              ${this._assistantCard(
                this.hass.localize(
                  "ui.panel.config.cloud.account.onboarding.alexa_name"
                ),
                mdiMicrophone,
                "alexa",
                this.hass.localize(
                  "ui.panel.config.cloud.account.onboarding.alexa_tagline"
                ),
                [
                  this.hass.localize(
                    "ui.panel.config.cloud.account.onboarding.alexa_bullet1"
                  ),
                  this.hass.localize(
                    "ui.panel.config.cloud.account.onboarding.alexa_bullet2"
                  ),
                ],
                cloudStatus.alexa_registered
              )}
              ${this._assistantCard(
                this.hass.localize(
                  "ui.panel.config.cloud.account.onboarding.google_name"
                ),
                mdiGoogleAssistant,
                "google",
                this.hass.localize(
                  "ui.panel.config.cloud.account.onboarding.google_tagline"
                ),
                [
                  this.hass.localize(
                    "ui.panel.config.cloud.account.onboarding.google_bullet1"
                  ),
                  this.hass.localize(
                    "ui.panel.config.cloud.account.onboarding.google_bullet2"
                  ),
                ],
                cloudStatus.google_registered
              )}
            </div>
          </ha-expansion-panel>

          <ha-expansion-panel
            outlined
            data-panel="streaming"
            .expanded=${this._openPanel === "streaming"}
            @expanded-changed=${this._panelExpanded}
          >
            ${this._panelHeader(
              "streaming",
              mdiVideo,
              this.hass.localize(
                "ui.panel.config.cloud.account.onboarding.streaming_title"
              ),
              this.hass.localize(
                "ui.panel.config.cloud.account.onboarding.streaming_helper"
              )
            )}
            <div class="panel-body">
              <p class="muted">
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.onboarding.streaming_body"
                )}
              </p>
              <ha-button appearance="plain" @click=${this._toggleWebrtc}>
                ${cloudStatus.prefs.cloud_ice_servers_enabled
                  ? this.hass.localize(
                      "ui.panel.config.cloud.account.onboarding.turn_off"
                    )
                  : this.hass.localize(
                      "ui.panel.config.cloud.account.onboarding.turn_on"
                    )}
              </ha-button>
            </div>
          </ha-expansion-panel>
        </div>

        <ha-dialog-footer slot="footer">
          <ha-button slot="primaryAction" @click=${this.closeDialog}>
            ${this.hass.localize(
              "ui.panel.config.cloud.account.onboarding.done"
            )}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _panelHeader(
    key: CloudOnboardingItem,
    icon: string,
    title: string,
    helper: string
  ): TemplateResult {
    return html`
      <div slot="leading-icon" class="panel-icon ${key}">
        <ha-svg-icon .path=${icon}></ha-svg-icon>
      </div>
      <div slot="header" class="panel-header">
        <div class="panel-heading">
          <span class="panel-title">${title}</span>
          <span class="panel-sub">${helper}</span>
        </div>
        ${this._statusTick(this._panelCompleted(key))}
      </div>
    `;
  }

  private _panelCompleted(key: CloudOnboardingItem): boolean {
    return this._cloudStatus
      ? onboardingPanelCompleted(key, this._cloudStatus, this._backupConfig)
      : false;
  }

  private _statusTick(completed: boolean) {
    if (!completed) {
      return nothing;
    }
    return html`
      <ha-svg-icon class="status-tick on" .path=${mdiCheckCircle}></ha-svg-icon>
    `;
  }

  private _panelExpanded(ev: CustomEvent<{ expanded: boolean }>) {
    const key = (ev.currentTarget as HTMLElement).getAttribute("data-panel");
    if (ev.detail.expanded) {
      this._openPanel = key ?? undefined;
    } else if (this._openPanel === key) {
      this._openPanel = undefined;
    }
  }

  private _voiceCloudCard(): TemplateResult {
    return html`
      <div class="option-card">
        <div class="option-head">
          <div class="option-icon cloud">
            <ha-logo-svg></ha-logo-svg>
          </div>
          <div class="option-heading">
            <span class="option-title"
              >${this.hass.localize(
                "ui.panel.config.cloud.account.onboarding.ha_cloud_title"
              )}</span
            >
            <span class="option-sub">
              ${this.hass.localize(
                "ui.panel.config.cloud.account.onboarding.ha_cloud_sub"
              )}
            </span>
          </div>
          <span class="pill active"
            >${this.hass.localize(
              "ui.panel.config.cloud.account.onboarding.included"
            )}</span
          >
        </div>
        <div class="option-actions">
          <ha-button
            appearance="plain"
            href="https://www.home-assistant.io/voice_control/"
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize(
              "ui.panel.config.cloud.account.onboarding.learn_more"
            )}
          </ha-button>
        </div>
      </div>
    `;
  }

  private _assistantCard(
    name: string,
    icon: string,
    colorKey: string,
    tagline: string,
    bullets: string[],
    linked: boolean
  ): TemplateResult {
    return html`
      <div class="option-card">
        <div class="option-head">
          <div class="option-icon ${colorKey}">
            <ha-svg-icon .path=${icon}></ha-svg-icon>
          </div>
          <div class="option-heading">
            <span class="option-title">${name}</span>
            <span class="option-sub">${tagline}</span>
          </div>
          ${linked
            ? html`
                <span class="pill active"
                  >${this.hass.localize(
                    "ui.panel.config.cloud.account.onboarding.active"
                  )}</span
                >
              `
            : nothing}
        </div>
        ${linked
          ? html`
              <div class="option-actions">
                <ha-button
                  appearance="plain"
                  href="/config/voice-assistants/assistants?historyBack=1"
                  @click=${this.closeDialog}
                >
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.onboarding.manage"
                  )}
                </ha-button>
              </div>
            `
          : html`
              <ul class="option-bullets">
                ${bullets.map(
                  (bullet) => html`
                    <li>
                      <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>${bullet}
                    </li>
                  `
                )}
              </ul>
              <div class="option-actions">
                <ha-button
                  href="/config/voice-assistants/assistants?historyBack=1"
                  @click=${this.closeDialog}
                >
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.onboarding.set_up",
                    { name }
                  )}
                </ha-button>
              </div>
            `}
      </div>
    `;
  }

  private get _cloudBackupEnabled(): boolean {
    return cloudBackupEnabled(this._backupConfig);
  }

  private _firstIncompletePanel(): CloudOnboardingItem | undefined {
    return ONBOARDING_ITEMS.find((key) => !this._panelCompleted(key));
  }

  private async _refreshStatus() {
    const status = await fetchCloudStatus(this.hass);
    if (status.logged_in) {
      this._cloudStatus = status;
    }
  }

  private async _refreshBackupConfig() {
    if (!isComponentLoaded(this.hass.config, "backup")) {
      return;
    }
    try {
      const result = await fetchBackupConfig(this.hass);
      this._backupConfig = result.config;
    } catch {
      // Best effort; keep the last known config.
    }
  }

  private async _toggleRemote() {
    if (!this._cloudStatus) {
      return;
    }
    const enable = !this._cloudStatus.prefs.remote_enabled;
    try {
      if (enable) {
        await connectCloudRemote(this.hass);
      } else {
        await disconnectCloudRemote(this.hass);
      }
      await this._refreshStatus();
      this._params?.onChanged?.();
    } catch (err: any) {
      showToast(this, { message: err.message });
    }
  }

  private async _toggleWebrtc() {
    if (!this._cloudStatus) {
      return;
    }
    const enable = !this._cloudStatus.prefs.cloud_ice_servers_enabled;
    try {
      await updateCloudPref(this.hass, {
        cloud_ice_servers_enabled: enable,
      });
      await this._refreshStatus();
      this._params?.onChanged?.();
    } catch (err: any) {
      showToast(this, { message: err.message });
    }
  }

  private async _toggleCloudBackup() {
    const config = this._backupConfig;
    if (!config) {
      return;
    }

    if (!config.automatic_backups_configured) {
      this.closeDialog();
      navigate("/config/backup?historyBack=1");
      return;
    }

    const agentIds = this._cloudBackupEnabled
      ? config.create_backup.agent_ids.filter((id) => id !== CLOUD_AGENT)
      : [...config.create_backup.agent_ids, CLOUD_AGENT];
    try {
      await updateBackupConfig(this.hass, {
        create_backup: { agent_ids: agentIds },
      });
      await this._refreshBackupConfig();
      this._params?.onChanged?.();
    } catch (err: any) {
      showToast(this, { message: err.message });
    }
  }

  static get styles() {
    return [
      haStyle,
      haStyleDialog,
      css`
        .muted {
          color: var(--secondary-text-color);
        }
        p.muted {
          margin: var(--ha-space-2) 0 0;
        }
        .setup-intro.muted {
          margin-bottom: var(--ha-space-6);
        }
        .setup-dialog {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-3);
        }
        .setup-dialog ha-expansion-panel {
          --expansion-panel-summary-padding: var(--ha-space-3) var(--ha-space-4);
        }
        .panel-header {
          flex: 1;
          display: flex;
          align-items: center;
          gap: var(--ha-space-3);
          min-width: 0;
        }
        .panel-heading {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .panel-title {
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
        }
        .panel-sub {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
          font-weight: var(--ha-font-weight-normal);
        }
        .status-tick {
          flex-shrink: 0;
        }
        .status-tick.on {
          color: var(--success-color);
        }
        .panel-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          --mdc-icon-size: 22px;
          flex-shrink: 0;
        }
        .panel-icon.remote {
          color: var(--blue-color);
          background-color: color-mix(
            in srgb,
            var(--blue-color) 15%,
            transparent
          );
        }
        .panel-icon.backup {
          color: var(--green-color);
          background-color: color-mix(
            in srgb,
            var(--green-color) 15%,
            transparent
          );
        }
        .panel-icon.voice {
          color: var(--purple-color);
          background-color: color-mix(
            in srgb,
            var(--purple-color) 15%,
            transparent
          );
        }
        .panel-icon.streaming {
          color: var(--cyan-color);
          background-color: color-mix(
            in srgb,
            var(--cyan-color) 15%,
            transparent
          );
        }
        .panel-body {
          padding: var(--ha-space-2) var(--ha-space-5) var(--ha-space-5)
            var(--ha-space-14);
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-3);
        }
        .panel-body p {
          margin: 0;
        }
        .panel-body > ha-button {
          align-self: flex-start;
          --ha-button-padding-inline: 0;
        }
        .option-card {
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-lg, 12px);
          padding: var(--ha-space-4);
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-3);
        }
        .option-head {
          display: flex;
          align-items: center;
          gap: var(--ha-space-3);
        }
        .option-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          --mdc-icon-size: 22px;
          flex-shrink: 0;
        }
        .option-icon.cloud {
          color: var(--primary-color);
          background-color: color-mix(
            in srgb,
            var(--primary-color) 15%,
            transparent
          );
        }
        .option-icon.alexa {
          color: var(--cyan-color);
          background-color: color-mix(
            in srgb,
            var(--cyan-color) 15%,
            transparent
          );
        }
        .option-icon.google {
          color: var(--blue-color);
          background-color: color-mix(
            in srgb,
            var(--blue-color) 15%,
            transparent
          );
        }
        .option-heading {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .option-title {
          font-weight: var(--ha-font-weight-medium);
        }
        .option-sub {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
        }
        .pill {
          flex-shrink: 0;
          align-self: flex-start;
          padding: 2px var(--ha-space-2);
          border-radius: 999px;
          font-size: var(--ha-font-size-s);
          white-space: nowrap;
        }
        .pill.active {
          background-color: color-mix(
            in srgb,
            var(--primary-text-color) 8%,
            transparent
          );
          color: var(--secondary-text-color);
        }
        .option-bullets {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-1);
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
        }
        .option-bullets li {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
        }
        .option-bullets ha-svg-icon {
          color: var(--success-color);
          --mdc-icon-size: 18px;
          flex-shrink: 0;
        }
        .option-actions {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-cloud-onboarding": DialogCloudOnboarding;
  }
}
