import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../layouts/hass-subpage";

import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import "../../../components/ha-relative-time";
import "../../../components/ha-settings-row";

import type { BackupAgentsInfo, BackupContent } from "../../../data/backup";
import { fetchBackupDetails } from "../../../data/backup";
import type { HomeAssistant } from "../../../types";

@customElement("ha-config-backup-details")
class HaConfigBackupDetails extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public backupAgentsInfo?: BackupAgentsInfo;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "backup-slug" }) public backupSlug!: string;

  @state() private _backup?: BackupContent | null;

  @state() private _error?: string;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    if (this.backupSlug) {
      this._fetchBackup();
    } else {
      this._error = "Backup slug not defined";
    }
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html`:(`;
    }
    return html`
      <hass-subpage
        back-path="/config/backup/list"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this._backup?.name || "Backup"}
      >
        <div class="content">
          ${this._error &&
          html`<ha-alert alert-type="error">${this._error}</ha-alert>`}
          ${this._backup === null
            ? html`<ha-alert alert-type="warning" title="Not found">
                Backup matching ${this.backupSlug} not found
              </ha-alert>`
            : !this._backup
              ? html`<ha-circular-progress active></ha-circular-progress>`
              : html`
                  <ha-card header="Backup">
                    <div class="card-content">
                      <ha-settings-row>
                        <span slot="heading">Partial</span>
                        <span slot="description">Type</span>
                      </ha-settings-row>

                      <ha-settings-row>
                        <span slot="heading">
                          ${Math.ceil(this._backup.size * 10) / 10 + " MB"}
                        </span>
                        <span slot="description">Size</span>
                      </ha-settings-row>
                      <ha-settings-row>
                        <ha-relative-time
                          .hass=${this.hass}
                          .datetime=${this._backup.date}
                          slot="heading"
                          capitalize
                        >
                        </ha-relative-time>
                        <span slot="description">Created</span>
                      </ha-settings-row>
                    </div>
                  </ha-card>
                `}
        </div>
      </hass-subpage>
    `;
  }

  private async _fetchBackup() {
    try {
      const response = await fetchBackupDetails(this.hass, this.backupSlug);
      this._backup = response.backup;
    } catch (err: any) {
      this._error = err?.message || "Could not fetch backup details";
    }
  }

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 690px;
      margin: 0 auto;
      gap: 24px;
      display: grid;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-details": HaConfigBackupDetails;
  }
}
