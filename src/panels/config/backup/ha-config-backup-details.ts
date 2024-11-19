import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import type { BackupContent } from "../../../data/backup";
import { fetchBackupDetails } from "../../../data/backup";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { domainToName } from "../../../data/integration";

@customElement("ha-config-backup-details")
class HaConfigBackupDetails extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "backup-id" }) public backupId!: string;

  @state() private _backup?: BackupContent | null;

  @state() private _error?: string;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    if (this.backupId) {
      this._fetchBackup();
    } else {
      this._error = "Backup id not defined";
    }
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <hass-subpage
        back-path="/config/backup"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this._backup?.name || "Backup"}
      >
        <div class="content">
          ${this._error &&
          html`<ha-alert alert-type="error">${this._error}</ha-alert>`}
          ${this._backup === null
            ? html`<ha-alert alert-type="warning" title="Not found">
                Backup matching ${this.backupId} not found
              </ha-alert>`
            : !this._backup
              ? html`<ha-circular-progress active></ha-circular-progress>`
              : html`
                  <ha-card header="Backup">
                    <div class="card-content">
                      <ha-md-list>
                        <ha-md-list-item>
                          <span slot="headline">
                            ${Math.ceil(this._backup.size * 10) / 10 + " MB"}
                          </span>
                          <span slot="supporting-text">Size</span>
                        </ha-md-list-item>
                        <ha-md-list-item>
                          ${formatDateTime(
                            new Date(this._backup.date),
                            this.hass.locale,
                            this.hass.config
                          )}
                          <span slot="supporting-text">Created</span>
                        </ha-md-list-item>
                      </ha-md-list>
                    </div>
                  </ha-card>
                  <ha-card header="Locations">
                    <div class="card-content">
                      <ha-md-list>
                        ${this._backup.agent_ids?.map((agent) => {
                          const [domain, name] = agent.split(".");
                          const domainName = domainToName(
                            this.hass.localize,
                            domain
                          );

                          return html`
                            <ha-md-list-item>
                              <img
                                .src=${brandsUrl({
                                  domain,
                                  type: "icon",
                                  useFallback: true,
                                  darkOptimized: this.hass.themes?.darkMode,
                                })}
                                crossorigin="anonymous"
                                referrerpolicy="no-referrer"
                                alt=""
                                slot="start"
                              />
                              <div slot="headline">${domainName}: ${name}</div>
                            </ha-md-list-item>
                          `;
                        })}
                      </ha-md-list>
                    </div>
                  </ha-card>
                `}
        </div>
      </hass-subpage>
    `;
  }

  private async _fetchBackup() {
    try {
      const response = await fetchBackupDetails(this.hass, this.backupId);
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
    .card-content {
      padding: 0 20px 8px 20px;
    }
    ha-md-list {
      background: none;
      padding: 0;
    }
    ha-md-list-item {
      --md-list-item-leading-space: 0;
      --md-list-item-trailing-space: 0;
    }
    ha-md-list-item img {
      width: 48px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-details": HaConfigBackupDetails;
  }
}
