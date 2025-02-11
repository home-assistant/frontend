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
import { fireEvent } from "../../common/dom/fire_event";

@customElement("onboarding-restore-backup-restore")
class OnboardingRestoreBackupRestore extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ attribute: false }) public backup!: BackupContentExtended;

  @property({ attribute: false })
  public selectedData!: BackupData;

  @property({ type: Boolean }) public supervisor = false;

  @state() private _encryptionKey = "";

  @state() private _encryptionKeyWrong = false;

  @state() private _error?: string;

  @state() private _loading = false;

  render() {
    const agentId = this.supervisor ? HASSIO_LOCAL_AGENT : CORE_LOCAL_AGENT;
    const backupProtected = this.backup.agents[agentId].protected;

    return html`
      ${this.backup.homeassistant_included &&
      !this.supervisor &&
      (this.backup.addons.length > 0 || this.backup.folders.length > 0)
        ? html`<ha-alert alert-type="warning" class="supervisor-warning">
            ${this.localize(
              "ui.panel.page-onboarding.restore.details.addons_unsupported"
            )}
          </ha-alert>`
        : nothing}
      <ha-card
        .header=${this.localize("ui.panel.page-onboarding.restore.restore")}
      >
        <div class="card-content">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert> `
            : nothing}
          <p>
            ${this.localize(
              "ui.panel.page-onboarding.restore.confirm_restore_full_backup_text"
            )}
          </p>
          ${backupProtected
            ? html`<p>
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
                  .disabled=${this._loading}
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
            .progress=${this._loading}
            .disabled=${this._loading ||
            (backupProtected && this._encryptionKey === "")}
            @click=${this._startRestore}
            destructive
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
    this._loading = true;
    this._error = undefined;
    this._encryptionKeyWrong = false;

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
      fireEvent(this, "restore-started");
    } catch (err: any) {
      if (err.error === "Request error") {
        // core can shutdown before we get a response
        button.actionSuccess();
        fireEvent(this, "restore-started");
        return;
      }

      button.actionError();
      if (err.body?.code === "incorrect_password") {
        this._encryptionKeyWrong = true;
      } else {
        this._error =
          err.body?.message || err.message || "Unknown error occurred";
      }
      this._loading = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          padding: 28px 20px 0;
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
        }
        .supervisor-warning {
          display: block;
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-restore-backup-restore": OnboardingRestoreBackupRestore;
  }
  interface HASSDomEvents {
    "restore-started";
  }
}
