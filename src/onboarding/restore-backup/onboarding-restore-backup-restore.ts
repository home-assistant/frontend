import { css, html, LitElement, nothing, type CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-card";
import "../../components/ha-alert";
import "../../components/buttons/ha-progress-button";
import "../../components/ha-password-field";
import { haStyle } from "../../resources/styles";
import type { LocalizeFunc } from "../../common/translations/localize";
import {
  CORE_LOCAL_AGENT,
  HASSIO_LOCAL_AGENT,
  type BackupContentExtended,
  type BackupData,
} from "../../data/backup";
import { restoreOnboardingBackup } from "../../data/backup_onboarding";
import type { HaProgressButton } from "../../components/buttons/ha-progress-button";

@customElement("onboarding-restore-backup-restore")
class OnboardingRestoreBackupRestore extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ type: Object }) public backup!: BackupContentExtended;

  @property({ type: Object, attribute: false })
  public selectedData!: BackupData;

  @property({ type: Boolean }) public supervisor = false;

  @state() private _encryptionKey = "";

  @state() private _encryptionKeyWrong = false;

  @state() private _error?: string;

  @state() private _loading = false;

  render() {
    return html`
      <ha-card
        .header=${this.localize("ui.panel.page-onboarding.restore.restore")}
      >
        <div class="card-content">
          ${this._error
            ? html` <ha-alert alert-type="error"> ${this._error} </ha-alert> `
            : nothing}
          <p>
            ${this.localize(
              "ui.panel.page-onboarding.restore.confirm_restore_full_backup_text"
            )}
          </p>
          ${this.backup.protected
            ? html` <p>
                  ${this.localize(
                    "ui.panel.page-onboarding.restore.details.restore.encryption.title"
                  )}
                </p>
                ${this._encryptionKeyWrong
                  ? html`
                      <ha-alert alert-type="error">
                        ${this.localize(
                          "ui.panel.page-onboarding.restore.details.restore.encryption.incorrect_key"
                        )}
                      </ha-alert>
                    `
                  : nothing}
                <ha-password-field
                  ?disabled=${this._loading}
                  @input=${this._encryptionKeyChanged}
                  .label=${this.localize(
                    "ui.panel.page-onboarding.restore.details.restore.encryption.input_label"
                  )}
                  .value=${this._encryptionKey}
                ></ha-password-field>`
            : nothing}
        </div>
        <div class="card-actions">
          <ha-progress-button
            ?disabled=${this._loading ||
            (this.backup.protected && this._encryptionKey === "")}
            @click=${this._startRestore}
          >
            ${this.localize(
              "ui.panel.page-onboarding.restore.details.restore.action"
            )}
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  private _encryptionKeyChanged(ev): void {
    this._encryptionKey = ev.target.value;
  }

  private async _startRestore(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as HaProgressButton;
    button.progress = true;
    this._loading = true;

    const backupAgent = this.supervisor ? HASSIO_LOCAL_AGENT : CORE_LOCAL_AGENT;

    try {
      await restoreOnboardingBackup({
        agent_id: backupAgent,
        backup_id: this.backup.backup_id,
        password: this._encryptionKey || undefined,
        restore_addons: this.selectedData.addons.map((addon) => addon.slug),
        restore_database: this.selectedData.database_included,
        restore_folders: this.selectedData.folders,
      });
      button.actionSuccess();
    } catch (err: any) {
      button.actionError();
      this._error = err.message || "Unknown error occurred";
    }

    button.progress = false;
    this._loading = false;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          width: 100%;
        }
        .card-header {
          padding-bottom: 8px;
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-restore-backup-restore": OnboardingRestoreBackupRestore;
  }
}
