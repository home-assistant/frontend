import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-card";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-button";
import "./ha-backup-data-picker";
import type { HomeAssistant } from "../../../../types";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import { bytesToString } from "../../../../util/bytes-to-string";
import { formatDateTime } from "../../../../common/datetime/format_date_time";
import type {
  BackupContentExtended,
  BackupData,
} from "../../../../data/backup";
import { fireEvent } from "../../../../common/dom/fire_event";

declare global {
  interface HASSDomEvents {
    "backup-restore": { selectedData?: BackupData };
  }
}

@customElement("ha-backup-details")
class HaBackupDetails extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ type: Object }) public backup!: BackupContentExtended;

  @state() private _selectedData?: BackupData;

  render() {
    const localize = this.localize || this.hass!.localize;

    return html`
      <ha-card>
        <div class="card-header">
          ${localize("ui.panel.page-onboarding.restore.details.summary.title")}
        </div>
        <div class="card-content">
          <ha-md-list class="summary">
            <ha-md-list-item>
              <span slot="headline">
                ${localize(
                  "ui.panel.page-onboarding.restore.details.summary.size"
                )}
              </span>
              <span slot="supporting-text">
                ${bytesToString(this.backup.size)}
              </span>
            </ha-md-list-item>
            ${this.hass
              ? // TODO - make this work in onboarding
                html`
                  <ha-md-list-item>
                    <span slot="headline">
                      ${localize(
                        "ui.panel.page-onboarding.restore.details.summary.created"
                      )}
                    </span>
                    <span slot="supporting-text">
                      ${formatDateTime(
                        new Date(this.backup.date),
                        this.hass.locale,
                        this.hass.config
                      )}
                    </span>
                  </ha-md-list-item>
                `
              : nothing}
            <ha-md-list-item>
              <span slot="headline">
                ${localize(
                  "ui.panel.page-onboarding.restore.details.summary.protection"
                )}
              </span>
              <span slot="supporting-text">
                ${this.backup.protected
                  ? localize(
                      "ui.panel.page-onboarding.restore.details.summary.protected_encrypted_aes_128"
                    )
                  : localize(
                      "ui.panel.page-onboarding.restore.details.summary.protected_not_encrypted"
                    )}
              </span>
            </ha-md-list-item>
          </ha-md-list>
        </div>
      </ha-card>
      <ha-card>
        <div class="card-header">
          ${localize("ui.panel.page-onboarding.restore.details.restore.title")}
        </div>
        <div class="card-content">
          <ha-backup-data-picker
            .localize=${this.localize}
            .hass=${this.hass}
            .data=${this.backup}
            .value=${this._selectedData}
            @value-changed=${this._selectedBackupChanged}
          >
          </ha-backup-data-picker>
        </div>
        <div class="card-actions">
          <ha-button
            @click=${this._restore}
            .disabled=${this._isRestoreDisabled()}
            class="danger"
          >
            ${localize(
              "ui.panel.page-onboarding.restore.details.restore.action"
            )}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _restore() {
    fireEvent(this, "backup-restore", { selectedData: this._selectedData });
  }

  private _selectedBackupChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._selectedData = ev.detail.value;
  }

  private _isRestoreDisabled() {
    // TODO when onboarding home assistant must be selected!
    return (
      !this._selectedData ||
      !(
        this._selectedData?.database_included ||
        this._selectedData?.homeassistant_included ||
        this._selectedData.addons.length ||
        this._selectedData.folders.length
      )
    );
  }

  static styles = css`
    :host {
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
    "ha-backup-details": HaBackupDetails;
  }
}
