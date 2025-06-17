import memoizeOne from "memoize-one";
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

@customElement("ha-backup-details-restore")
class HaBackupDetailsRestore extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ type: Object }) public backup!: BackupContentExtended;

  @property({ type: Boolean, attribute: "ha-required" })
  public haRequired = false;

  @property({ attribute: "translation-key-panel" }) public translationKeyPanel:
    | "page-onboarding.restore"
    | "config.backup" = "config.backup";

  @state() private _selectedData?: BackupData;

  protected willUpdate() {
    if (!this.hasUpdated && this.haRequired) {
      this._selectedData = {
        homeassistant_included: true,
        folders: [],
        addons: [],
        homeassistant_version: this.backup.homeassistant_version,
        database_included: this.backup.database_included,
      };
    }
  }

  render() {
    return html`
      <ha-card>
        <div class="card-header">
          ${this.localize(
            `ui.panel.${this.translationKeyPanel}.details.restore.title`
          )}
        </div>
        <div class="card-content">
          <ha-backup-data-picker
            .translationKeyPanel=${this.translationKeyPanel}
            .localize=${this.localize}
            .hass=${this.hass}
            .data=${this.backup}
            .value=${this._selectedData}
            @value-changed=${this._selectedBackupChanged}
            .requiredItems=${this._isHomeAssistantRequired(this.haRequired)}
          >
          </ha-backup-data-picker>
        </div>
        <div class="card-actions">
          <ha-button
            @click=${this._restore}
            .disabled=${this._isRestoreDisabled}
            variant="danger"
            appearance="plain"
          >
            ${this.localize(
              `ui.panel.${this.translationKeyPanel}.details.restore.action`
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

  private _isHomeAssistantRequired = memoizeOne((required: boolean) =>
    required ? ["config"] : []
  );

  private get _isRestoreDisabled(): boolean {
    return (
      !this._selectedData ||
      (this.haRequired && !this._selectedData.homeassistant_included) ||
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
    "ha-backup-details-restore": HaBackupDetailsRestore;
  }
  interface HASSDomEvents {
    "backup-restore": { selectedData?: BackupData };
  }
}
