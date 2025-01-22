import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import type { BackupAgent, BackupConfig } from "../../../data/backup";
import {
  computeBackupAgentName,
  fetchBackupAgentsInfo,
} from "../../../data/backup";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import "./components/ha-backup-data-picker";

@customElement("ha-config-backup-location")
class HaConfigBackupDetails extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "agent-id" }) public agentId!: string;

  @property({ attribute: false }) public config?: BackupConfig;

  @state() private _agent?: BackupAgent | null;

  @state() private _agentIds?: string[];

  @state() private _error?: string;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    if (this.agentId) {
      this._fetchAgent();
    } else {
      this._error = "Agent id not defined";
    }
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <hass-subpage
        back-path="/config/backup/settings"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${(this._agent &&
          computeBackupAgentName(
            this.hass.localize,
            this.agentId,
            this._agentIds
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
                  <ha-card>
                    <div class="card-header">
                      ${this.hass.localize(
                        "ui.panel.config.backup.location.encryption.title"
                      )}
                    </div>
                  </ha-card>
                `}
        </div>
      </hass-subpage>
    `;
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
      this._agentIds = agents.map((a) => a.agent_id);
    } catch (err: any) {
      this._error =
        err?.message ||
        this.hass.localize("ui.panel.config.backup.details.error");
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
