import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-switch";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import type {
  BackupAgent,
  BackupAgentConfig,
  BackupConfig,
} from "../../../data/backup";
import {
  CLOUD_AGENT,
  computeBackupAgentName,
  fetchBackupAgentsInfo,
  updateBackupConfig,
} from "../../../data/backup";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import "./components/ha-backup-data-picker";
import { showConfirmationDialog } from "../../lovelace/custom-card-helpers";
import { fireEvent } from "../../../common/dom/fire_event";

@customElement("ha-config-backup-location")
class HaConfigBackupDetails extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "agent-id" }) public agentId!: string;

  @property({ attribute: false }) public config?: BackupConfig;

  @property({ attribute: false }) public agents: BackupAgent[] = [];

  @state() private _agent?: BackupAgent | null;

  @state() private _error?: string;

  protected willUpdate(changedProps: PropertyValues): void {
    if (changedProps.has("agentId")) {
      if (this.agentId) {
        this._fetchAgent();
      } else {
        this._error = "Agent id not defined";
      }
    }
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const encrypted = this._isEncryptionTurnedOn();

    return html`
      <hass-subpage
        back-path="/config/backup/settings"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${(this._agent &&
          computeBackupAgentName(
            this.hass.localize,
            this.agentId,
            this.agents
          )) ||
        this.hass.localize("ui.panel.config.backup.location.header")}
      >
        <div class="content">
          ${this._error &&
          html`<ha-alert alert-type="error">${this._error}</ha-alert>`}
          ${this._agent === null
            ? html`
                <ha-alert
                  alert-type="warning"
                  .title=${this.hass.localize(
                    "ui.panel.config.backup.location.not_found"
                  )}
                >
                  ${this.hass.localize(
                    "ui.panel.config.backup.location.not_found_description",
                    { agentId: this.agentId }
                  )}
                </ha-alert>
              `
            : !this.agentId
              ? html`<ha-circular-progress active></ha-circular-progress>`
              : html`
                  ${CLOUD_AGENT === this.agentId
                    ? html`
                        <ha-card>
                          <div class="card-header">
                            ${this.hass.localize(
                              "ui.panel.config.backup.location.configuration.title"
                            )}
                          </div>
                          <div class="card-content">
                            <p>
                              ${this.hass.localize(
                                "ui.panel.config.backup.location.configuration.cloud_description"
                              )}
                            </p>
                          </div>
                        </ha-card>
                      `
                    : nothing}
                  <ha-card>
                    <div class="card-header">
                      ${this.hass.localize(
                        "ui.panel.config.backup.location.encryption.title"
                      )}
                    </div>
                    <div class="card-content">
                      <p>
                        ${this.hass.localize(
                          "ui.panel.config.backup.location.encryption.description"
                        )}
                      </p>
                      <ha-md-list>
                        ${CLOUD_AGENT === this.agentId
                          ? html`
                              <ha-md-list-item>
                                <span slot="headline">
                                  ${this.hass.localize(
                                    "ui.panel.config.backup.location.encryption.location_encrypted"
                                  )}
                                </span>
                                <span slot="supporting-text">
                                  ${this.hass.localize(
                                    "ui.panel.config.backup.location.encryption.location_encrypted_cloud_description"
                                  )}
                                </span>
                                <a
                                  href="https://www.nabucasa.com/config/backups/"
                                  target="_blank"
                                  slot="end"
                                  rel="noreferrer noopener"
                                >
                                  <ha-button>
                                    ${this.hass.localize(
                                      "ui.panel.config.backup.location.encryption.location_encrypted_cloud_learn_more"
                                    )}
                                  </ha-button>
                                </a>
                              </ha-md-list-item>
                            `
                          : encrypted
                            ? html`
                                <ha-md-list-item>
                                  <span slot="headline">
                                    ${this.hass.localize(
                                      "ui.panel.config.backup.location.encryption.location_encrypted"
                                    )}
                                  </span>
                                  <span slot="supporting-text">
                                    ${this.hass.localize(
                                      `ui.panel.config.backup.location.encryption.location_encrypted_description`
                                    )}
                                  </span>

                                  <ha-button
                                    slot="end"
                                    @click=${this._turnOffEncryption}
                                    destructive
                                  >
                                    ${this.hass.localize(
                                      "ui.panel.config.backup.location.encryption.encryption_turn_off"
                                    )}
                                  </ha-button>
                                </ha-md-list-item>
                              `
                            : html`
                                <ha-alert
                                  alert-type="warning"
                                  .title=${this.hass.localize(
                                    "ui.panel.config.backup.location.encryption.warning_encryption_turn_off"
                                  )}
                                >
                                  ${this.hass.localize(
                                    "ui.panel.config.backup.location.encryption.warning_encryption_turn_off_description"
                                  )}
                                </ha-alert>
                                <ha-md-list-item>
                                  <span slot="headline">
                                    ${this.hass.localize(
                                      "ui.panel.config.backup.location.encryption.location_unencrypted"
                                    )}
                                  </span>
                                  <span slot="supporting-text">
                                    ${this.hass.localize(
                                      `ui.panel.config.backup.location.encryption.location_unencrypted_description`
                                    )}
                                  </span>

                                  <ha-button
                                    slot="end"
                                    @click=${this._turnOnEncryption}
                                  >
                                    ${this.hass.localize(
                                      "ui.panel.config.backup.location.encryption.encryption_turn_on"
                                    )}
                                  </ha-button>
                                </ha-md-list-item>
                              `}
                      </ha-md-list>
                    </div>
                  </ha-card>
                `}
        </div>
      </hass-subpage>
    `;
  }

  private _isEncryptionTurnedOn() {
    const agentConfig = this.config?.agents[this.agentId] as
      | BackupAgentConfig
      | undefined;

    if (!agentConfig) {
      return true;
    }
    return agentConfig.protected;
  }

  private async _fetchAgent() {
    try {
      // Todo fetch agent details
      const { agents } = await fetchBackupAgentsInfo(this.hass);
      const agent = agents.find((a) => a.agent_id === this.agentId);
      if (!agent) {
        throw new Error("Agent not found");
      }
      this._agent = agent;
    } catch (err: any) {
      this._error =
        err?.message ||
        this.hass.localize("ui.panel.config.backup.details.error");
    }
  }

  private async _updateAgentEncryption(value: boolean) {
    const agentsConfig = {
      ...this.config?.agents,
      [this.agentId]: {
        ...this.config?.agents[this.agentId],
        protected: value,
      },
    };
    await updateBackupConfig(this.hass, {
      agents: agentsConfig,
    });
    fireEvent(this, "ha-refresh-backup-config");
  }

  private _turnOnEncryption() {
    this._updateAgentEncryption(true);
  }

  private async _turnOffEncryption() {
    const response = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.backup.location.encryption.encryption_turn_off_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.backup.location.encryption.encryption_turn_off_confirm_text"
      ),
      confirmText: this.hass.localize(
        "ui.panel.config.backup.location.encryption.encryption_turn_off_confirm_action"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      destructive: true,
    });
    if (response) {
      this._updateAgentEncryption(false);
    }
  }

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 690px;
      margin: 0 auto;
      gap: 24px;
      display: grid;
      margin-bottom: 24px;
    }
    .card-content {
      padding: 0 20px;
    }
    .card-actions {
      display: flex;
      justify-content: flex-end;
    }
    ha-md-list {
      background: none;
      padding: 0;
    }
    ha-md-list-item {
      --md-list-item-leading-space: 0;
      --md-list-item-trailing-space: 0;
      --md-list-item-two-line-container-height: 64px;
    }
    ha-md-list-item img {
      width: 48px;
    }
    ha-md-list-item ha-svg-icon[slot="start"] {
      --mdc-icon-size: 48px;
      color: var(--primary-text-color);
    }
    ha-md-list.summary ha-md-list-item {
      --md-list-item-supporting-text-size: 1rem;
      --md-list-item-label-text-size: 0.875rem;

      --md-list-item-label-text-color: var(--secondary-text-color);
      --md-list-item-supporting-text-color: var(--primary-text-color);
    }
    .warning {
      color: var(--error-color);
    }
    .warning ha-svg-icon {
      color: var(--error-color);
    }
    ha-button.danger {
      --mdc-theme-primary: var(--error-color);
    }
    ha-backup-data-picker {
      display: block;
    }
    ha-md-list-item [slot="supporting-text"] {
      display: flex;
      align-items: center;
      flex-direction: row;
      gap: 8px;
      line-height: normal;
    }
    .dot {
      display: block;
      position: relative;
      width: 8px;
      height: 8px;
      background-color: var(--disabled-color);
      border-radius: 50%;
      flex: none;
    }
    .dot.success {
      background-color: var(--success-color);
    }
    .dot.error {
      background-color: var(--error-color);
    }
    .card-header {
      padding-bottom: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-location": HaConfigBackupDetails;
  }
}
