import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-card";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-button";
import "./ha-backup-data-picker";
import type { HomeAssistant } from "../../../../types";
import type { LocalizeFunc } from "../../../../common/translations/localize";
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

@customElement("ha-backup-details-restore")
class HaBackupDetailsRestore extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ type: Object }) public backup!: BackupContentExtended;

  @property({ type: Boolean, attribute: "restore-disabled" })
  public restoreDisabled = false;

  @property({ type: Boolean, attribute: "addons-disabled" })
  public addonsDisabled = false;

  @state() private _selectedData?: BackupData;

  render() {
    const localize = this.localize || this.hass!.localize;

    return html`
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
            ?addons-disabled=${this.addonsDisabled}
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
    return (
      this.restoreDisabled ||
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
    "ha-backup-details-restore": HaBackupDetailsRestore;
  }
}
