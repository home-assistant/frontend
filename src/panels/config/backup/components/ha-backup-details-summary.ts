import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/ha-card";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import type { HomeAssistant } from "../../../../types";
import { formatDateTime } from "../../../../common/datetime/format_date_time";
import {
  computeBackupSize,
  computeBackupType,
  type BackupContentExtended,
} from "../../../../data/backup";
import { bytesToString } from "../../../../util/bytes-to-string";

@customElement("ha-backup-details-summary")
class HaBackupDetailsSummary extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public backup!: BackupContentExtended;

  @property({ type: Boolean, attribute: "hassio" }) public isHassio = false;

  render() {
    const backupDate = new Date(this.backup.date);
    const formattedDate = formatDateTime(
      backupDate,
      this.hass.locale,
      this.hass.config
    );

    return html`
      <ha-card>
        <div class="card-header">
          ${this.hass.localize("ui.panel.config.backup.details.summary.title")}
        </div>
        <div class="card-content">
          <ha-md-list class="summary">
            <ha-md-list-item>
              <span slot="headline">
                ${this.hass.localize("ui.panel.config.backup.backup_type")}
              </span>
              <span slot="supporting-text">
                ${this.hass.localize(
                  `ui.panel.config.backup.type.${computeBackupType(this.backup, this.isHassio)}`
                )}
              </span>
            </ha-md-list-item>
            <ha-md-list-item>
              <span slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.backup.details.summary.size"
                )}
              </span>
              <span slot="supporting-text">
                ${bytesToString(computeBackupSize(this.backup))}
              </span>
            </ha-md-list-item>
            <ha-md-list-item>
              <span slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.backup.details.summary.created"
                )}
              </span>
              <span slot="supporting-text">${formattedDate}</span>
            </ha-md-list-item>
          </ha-md-list>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      max-width: 690px;
      width: 100%;
      margin: 0 auto;
      gap: 24px;
      display: grid;
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
    ha-md-list.summary ha-md-list-item {
      --md-list-item-supporting-text-size: 1rem;
      --md-list-item-label-text-size: 0.875rem;

      --md-list-item-label-text-color: var(--secondary-text-color);
      --md-list-item-supporting-text-color: var(--primary-text-color);
    }
    ha-md-list-item [slot="supporting-text"] {
      display: flex;
      align-items: center;
      flex-direction: row;
      gap: 8px;
      line-height: var(--ha-line-height-condensed);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-details-summary": HaBackupDetailsSummary;
  }
}
