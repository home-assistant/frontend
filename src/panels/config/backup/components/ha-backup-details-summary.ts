import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/ha-card";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-button";
import type { HomeAssistant } from "../../../../types";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import {
  formatDateTime,
  formatDateTimeWithBrowserDefaults,
} from "../../../../common/datetime/format_date_time";
import {
  computeBackupSize,
  computeBackupType,
  type BackupContentExtended,
} from "../../../../data/backup";
import { bytesToString } from "../../../../util/bytes-to-string";

@customElement("ha-backup-details-summary")
class HaBackupDetailsSummary extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ type: Object }) public backup!: BackupContentExtended;

  @property({ type: Boolean, attribute: "hassio" }) public isHassio = false;

  @property({ attribute: "translation-key-panel" }) public translationKeyPanel:
    | "page-onboarding.restore"
    | "config.backup" = "config.backup";

  @property({ type: Boolean, attribute: "card-less" }) public cardLess = false;

  render() {
    const backupDate = new Date(this.backup.date);
    const formattedDate = this.hass
      ? formatDateTime(backupDate, this.hass.locale, this.hass.config)
      : formatDateTimeWithBrowserDefaults(backupDate);

    if (this.cardLess) {
      return this._renderContent(formattedDate);
    }

    return html`
      <ha-card>
        <div class="card-header">
          ${this.localize(
            `ui.panel.${this.translationKeyPanel}.details.summary.title`
          )}
        </div>
        <div class="card-content">${this._renderContent(formattedDate)}</div>
      </ha-card>
    `;
  }

  private _renderContent = (formattedDate: string) => html`
    <ha-md-list class="summary">
      ${this.translationKeyPanel === "config.backup"
        ? html`<ha-md-list-item>
            <span slot="headline">
              ${this.localize("ui.panel.config.backup.backup_type")}
            </span>
            <span slot="supporting-text">
              ${this.localize(
                `ui.panel.config.backup.type.${computeBackupType(this.backup, this.isHassio)}`
              )}
            </span>
          </ha-md-list-item>`
        : nothing}
      <ha-md-list-item>
        <span slot="headline">
          ${this.localize(
            `ui.panel.${this.translationKeyPanel}.details.summary.size`
          )}
        </span>
        <span slot="supporting-text">
          ${bytesToString(computeBackupSize(this.backup))}
        </span>
      </ha-md-list-item>
      <ha-md-list-item>
        <span slot="headline">
          ${this.localize(
            `ui.panel.${this.translationKeyPanel}.details.summary.created`
          )}
        </span>
        <span slot="supporting-text">${formattedDate}</span>
      </ha-md-list-item>
    </ha-md-list>
  `;

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
      line-height: normal;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-details-summary": HaBackupDetailsSummary;
  }
}
